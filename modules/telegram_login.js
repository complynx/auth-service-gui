let login_json = location.hash.substring(1) || "/auth/teelgram_auth/login_json";

async function init() {
    let result = await fetch(login_json).then(r=>r.json());

    let script = document.createElement("script");
    script.async = true;
    script.dataset.telegramLogin = result.bot_name;
    script.dataset.size = "large";
    script.dataset.authUrl = result.url;
    script.dataset.requestAccess = "write";
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    
    document.getElementById("container").appendChild(script);
}

init().catch(console.error);
