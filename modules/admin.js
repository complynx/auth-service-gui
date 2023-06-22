let base = "/auth"

async function get_users() {
    let users = await fetch(`${base}/adm/users`).then(r=>r.json());
    return users;
}

get_users().then(console.log, console.error);
