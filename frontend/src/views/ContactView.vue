<template>
  <div class="contact-container">
    <h2>Contacter l'administration</h2>
    <p>Un problème technique ou une question ? Envoyez-nous un message.</p>
    
    <form @submit.prevent="envoyerContact" class="contact-form">
      <label>Votre Email :</label>
      <input type="email" name="email" required placeholder="votre@email.com">
      
      <label>Sujet :</label>
      <select name="sujet">
        <option value="bug">Problème technique</option>
        <option value="abus">Signalement / Abus</option>
        <option value="autre">Autre</option>
      </select>
      
      <label>Message :</label>
      <textarea name="message" rows="5" required placeholder="Votre message..."></textarea>
      
      <button type="submit" class="btn-submit">Envoyer le message</button>
    </form>
  </div>
</template>

<script setup>
async function envoyerContact(e) {
    const form = e.target;
    const data = {
        email: form.email.value,
        sujet: form.sujet.value,
        message: form.message.value
    };

    try {
        await fetch('http://localhost:5000/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        alert("Votre message a bien été envoyé à l'administration.");
        form.reset();
    } catch (error) {
        console.error("Erreur:", error);
        alert("Impossible de joindre le serveur.");
    }
}
</script>

<style scoped>
.contact-container {
  max-width: 600px;
  margin: 2rem auto;
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.contact-form input, .contact-form select, .contact-form textarea {
  width: 100%;
  padding: 10px;
  margin: 8px 0 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}
.btn-submit {
  background: #ff6b6b;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
.btn-submit:hover {
  background: #ff5252;
}
</style>