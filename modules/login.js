let login_json = location.hash.substring(1) || "/auth/login_json";

async function init() {
    let result = await fetch(login_json).then(r=>r.json());

    if(!result.plugins)
        throw "no plugins in the result";

    if(Object.keys(result.plugins).length < 2) {
        // location.href = Object.values(result)[0];
        console.log(Object.values(result.plugins)[0]);
        return;
    }

    let list = document.getElementById("login_list");
    for(let plugin_name in result.plugins) {
        let plugin_url = result.plugins[plugin_name];

        let li = document.createElement("li");
        li.innerHTML=`<a href="${plugin_url}">${plugin_name}</a>`;
        list.appendChild(li);
    }
}

init().catch(console.error);
