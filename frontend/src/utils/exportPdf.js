// ==========================================================================
// Export d'une recette en PDF (côté navigateur, avec jsPDF)
// Contenu : bandeau (1re image + titre), infos, ingrédients, étapes. Pas de vidéo.
// ==========================================================================
import { imgSrc, formatIngredient, instructionSteps } from './recipes'

const PAGE = { w: 210, h: 297, margin: 16 }
const CONTENT_W = PAGE.w - PAGE.margin * 2
const HERO_H = 105                         // hauteur du bandeau image (pleine largeur de page)
const BRAND = [234, 88, 12]                // orange (à adapter à la couleur "brand" du site)
const BRAND_SOFT = [255, 247, 237]         // fond clair des ingrédients
const DARK = [15, 23, 42]
const TEXT = [51, 65, 85]
const MUTED = [100, 116, 139]
const LINE = [226, 232, 240]

// Les polices standard du PDF ne connaissent que le Latin-1 : on remplace les
// caractères typographiques courants et on retire le reste (emojis, etc.)
const clean = (value) =>
  String(value ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/[^\x09\x0A\x20-\x7E\xA0-\xFF]/g, '')
    .trim()

const fileName = (title) =>
  (title || 'recipe')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'recipe'

// Charge une image (lien http(s), /img/... du backend ou data URL) et la recadre
// "cover" (centrée, sans déformation) au rapport largeur/hauteur demandé.
// Renvoie null si elle ne peut pas être chargée (lien cassé, CORS bloqué...).
function loadImage(src, ratio) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onerror = () => resolve(null)
    img.onload = () => {
      try {
        const sw = img.naturalWidth
        const sh = img.naturalHeight
        // Zone de l'image source qui a exactement le bon rapport
        let cw = sw
        let ch = sw / ratio
        if (ch > sh) { ch = sh; cw = sh * ratio }
        const sx = (sw - cw) / 2
        const sy = (sh - ch) / 2

        const outW = Math.min(1600, Math.round(cw))
        const canvas = document.createElement('canvas')
        canvas.width = outW
        canvas.height = Math.round(outW / ratio)
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, sx, sy, cw, ch, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.88))
      } catch (e) {
        resolve(null) // canvas "tainted" : l'image n'autorise pas CORS
      }
    }
    img.src = src
  })
}

// 1re image de la recette qui peut réellement être chargée
async function firstImage(recipe, ratio) {
  for (const raw of recipe.images || []) {
    const data = await loadImage(imgSrc(raw), ratio)
    if (data) return data
  }
  return null
}

export async function exportRecipePdf(recipe) {
  const { jsPDF } = await import('jspdf') // chargé seulement au premier export
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  doc.setLineHeightFactor(1.15)
  let y = 0

  const ensureSpace = (height) => {
    if (y + height > PAGE.h - PAGE.margin - 4) {
      doc.addPage()
      y = PAGE.margin
    }
  }

  const heading = (label) => {
    ensureSpace(16)
    doc.setFillColor(...BRAND).roundedRect(PAGE.margin, y, 1.8, 7, 0.9, 0.9, 'F')
    doc.setFont('helvetica', 'bold').setFontSize(15).setTextColor(...DARK)
    doc.text(label, PAGE.margin + 5, y + 5.6)
    y += 13
  }

  const setOpacity = (opacity) => doc.setGState(new doc.GState({ opacity }))

  // ================= Bandeau : image pleine largeur + titre =================
  const steps = instructionSteps(recipe.instructions)
  const ingredients = recipe.ingredients || []
  const image = await firstImage(recipe, PAGE.w / HERO_H)

  doc.setFont('helvetica', 'bold').setFontSize(26)
  const titleLines = doc.splitTextToSize(clean(recipe.title), CONTENT_W)
  const titleH = titleLines.length * 10.5
  const blockH = 8 + 7 + 4 + titleH + 9            // marge + pastille + espace + titre + marge

  let heroH
  let blockY
  if (image) {
    heroH = HERO_H
    doc.addImage(image, 'JPEG', 0, 0, PAGE.w, HERO_H)   // largeur de page entière, proportions respectées
    blockY = HERO_H - Math.min(blockH, HERO_H)
    // Dégradé simulé : un voile léger au-dessus du voile principal
    setOpacity(0.22); doc.setFillColor(0, 0, 0).rect(0, blockY - 14, PAGE.w, 14, 'F')
    setOpacity(0.62); doc.setFillColor(0, 0, 0).rect(0, blockY, PAGE.w, HERO_H - blockY, 'F')
    setOpacity(1)
  } else {
    heroH = Math.max(50, blockH + 6)
    blockY = heroH - blockH
    doc.setFillColor(...BRAND).rect(0, 0, PAGE.w, heroH, 'F')
  }

  // Pastille de catégorie
  const category = clean(recipe.category).toUpperCase()
  if (category) {
    doc.setFont('helvetica', 'bold').setFontSize(8.5)
    const pillW = doc.getTextWidth(category) + 9
    doc.setFillColor(...(image ? BRAND : [255, 255, 255])).roundedRect(PAGE.margin, blockY + 8, pillW, 7, 3.5, 3.5, 'F')
    doc.setTextColor(...(image ? [255, 255, 255] : BRAND))
    doc.text(category, PAGE.margin + pillW / 2, blockY + 12.9, { align: 'center' })
  }

  // Titre
  doc.setFont('helvetica', 'bold').setFontSize(26).setTextColor(255, 255, 255)
  doc.text(titleLines, PAGE.margin, blockY + 8 + 7 + 4 + 7.5)

  y = heroH + 10

  // ================= Chiffres clés =================
  const stats = [
    ['PREP TIME', recipe.prepTime ? `${recipe.prepTime} min` : '-'],
    ['AUTHOR', clean(recipe.author) || '-'],
    ['INGREDIENTS', String(ingredients.length)],
    ['STEPS', String(steps.length)]
  ]
  const statW = CONTENT_W / stats.length
  stats.forEach(([label, value], i) => {
    const x = PAGE.margin + i * statW
    doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...MUTED)
    doc.text(label, x, y + 3)
    doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(...DARK)
    doc.text(doc.splitTextToSize(value, statW - 4)[0], x, y + 10)
  })
  y += 16
  doc.setDrawColor(...LINE).setLineWidth(0.3).line(PAGE.margin, y, PAGE.w - PAGE.margin, y)
  y += 10

  // ================= Ingrédients (2 colonnes) =================
  heading('Ingredients')
  const gap = 4
  const colW = (CONTENT_W - gap) / 2
  doc.setFont('helvetica', 'normal').setFontSize(10.5)
  for (let i = 0; i < ingredients.length; i += 2) {
    const cells = [ingredients[i], ingredients[i + 1]].filter(Boolean).map(ing =>
      doc.splitTextToSize(clean(formatIngredient(ing)), colW - 13))
    const cellH = Math.max(...cells.map(l => l.length)) * 5 + 5
    ensureSpace(cellH + 2.5)
    cells.forEach((lines, c) => {
      const x = PAGE.margin + c * (colW + gap)
      doc.setFillColor(...BRAND_SOFT).roundedRect(x, y, colW, cellH, 2, 2, 'F')
      doc.setFillColor(...BRAND).circle(x + 5, y + cellH / 2, 1.1, 'F')
      doc.setTextColor(...TEXT).text(lines, x + 10, y + 5.2)
    })
    y += cellH + 2.5
  }
  y += 8

  // ================= Étapes de préparation =================
  heading('Step-by-step preparation')
  steps.forEach((step, i) => {
    doc.setFont('helvetica', 'normal').setFontSize(11)
    const lines = doc.splitTextToSize(clean(step), CONTENT_W - 15)
    const h = Math.max(lines.length * 5.6, 8.4)
    ensureSpace(h + 7)
    doc.setFillColor(...BRAND).circle(PAGE.margin + 4.2, y + 4.2, 4.2, 'F')
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(255, 255, 255)
    doc.text(String(i + 1), PAGE.margin + 4.2, y + 5.6, { align: 'center' })
    doc.setFont('helvetica', 'normal').setFontSize(11).setTextColor(...TEXT)
    doc.text(lines, PAGE.margin + 15, y + 5)
    y += h + 3
    if (i < steps.length - 1) {
      doc.setDrawColor(...LINE).setLineWidth(0.25).line(PAGE.margin + 15, y, PAGE.w - PAGE.margin, y)
    }
    y += 4
  })

  // ================= Pied de page =================
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setDrawColor(...LINE).setLineWidth(0.25).line(PAGE.margin, PAGE.h - 12, PAGE.w - PAGE.margin, PAGE.h - 12)
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...BRAND)
    doc.text('GourmetCraft', PAGE.margin, PAGE.h - 7.5)
    doc.setFont('helvetica', 'normal').setTextColor(...MUTED)
    doc.text(`${p} / ${pages}`, PAGE.w - PAGE.margin, PAGE.h - 7.5, { align: 'right' })
  }

  doc.save(`${fileName(recipe.title)}.pdf`)
}
