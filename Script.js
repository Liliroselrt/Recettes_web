function toggleSub(button, creatorId) {
    button.classList.toggle('subscribed');
    const isSub = button.classList.contains('subscribed');
    button.innerText = isSub ? "✓ Abonné" : "+ S'abonner à l'auteur";

    fetch('/api/abonnement.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creator_id: creatorId, action: isSub ? 'sub' : 'unsub' })
    });
}


function openReport(type, targetId) {
    const motif = prompt("Pourquoi signalez-vous ce contenu ?");
    if (motif && motif.trim() !== "") {
        fetch('/api/signaler.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: type, target_id: targetId, motif: motif })
        }).then(() => alert("Signalement envoyé aux administrateurs."));
    }
}

function blockUser(userId) {
    if (confirm("Voulez-vous bloquer cet utilisateur ? Vous ne verrez plus ses recettes.")) {
        fetch('/api/bloquer.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocked_id: userId })
        }).then(() => {
            alert("Utilisateur bloqué.");
            location.reload(); 
        });
    }
}

function toggleChat() {
    const chat = document.getElementById('chat-window');
    chat.style.display = (chat.style.display === 'flex') ? 'none' : 'flex';
}

function sendMessage() {
    const input = document.getElementById('chat-text');
    const text = input.value.trim();
    if (text === "") return;

    const box = document.getElementById('chat-messages');
    box.innerHTML += `<div style="margin-top:5px;"><strong>Moi :</strong> ${text}</div>`;
    input.value = "";
    box.scrollTop = box.scrollHeight;

    fetch('/api/envoyer_message.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
    });
}

function adminDelete(type, id, btnElement) {
    if (confirm("Supprimer définitivement ce contenu ?")) {
        fetch(`/api/admin_delete.php?type=${type}&id=${id}`)
            .then(() => btnElement.closest('tr').remove());
    }
}

function adminBanUser(userId) {
    if (confirm("Bannir cet utilisateur définitivement ?")) {
        fetch(`/api/admin_ban.php?id=${userId}`)
            .then(() => alert("Utilisateur banni."));
    }
}