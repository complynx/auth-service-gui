let base = "/auth"

async function parse_response(r) {
    if(!r.ok) {
        if(r.status === 401 || r.status === 403) {
            if(confirm(`${r.statusText}. Redirect to login page?`)) {
                location.reload();
            }
        }
        if(r.status === 409) {
            let data = {
                code: 0,
                reason: "unspecified",
            }
            try{
                data = await r.json();
            } catch(e) {};
            if(data.code) {
                throw new Error(r.status + "|" + data.code + " " + data.reason);
            }
            throw new Error(r.status + " " + data.reason);
        }
        throw new Error(r.status + " " + r.statusText);
    }
    return await r.json();
}

async function method_get_users() {
    return await fetch(`${base}/adm/users`, { cache: "no-store" }).then(parse_response);
}

async function method_get_user_roles(id) {
    return await fetch(`${base}/adm/user/${id}/roles`, { cache: "no-store" }).then(parse_response);
}

async function method_change_user_roles(id, roles_change) {
    return await fetch(`${base}/adm/user/${id}/roles`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(roles_change),
    }).then(parse_response);
}

async function method_get_roles() {
    return await fetch(`${base}/adm/roles`, { cache: "no-store" }).then(parse_response);
}

async function method_get_role(id) {
    return await fetch(`${base}/adm/role/${id}`, { cache: "no-store" }).then(parse_response);
}

async function method_edit_role(id, description) {
    return await fetch(`${base}/adm/role/${id}`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(description),
    }).then(parse_response);
}

async function method_delete_role(id) {
    return await fetch(`${base}/adm/role/${id}`, {
        method: "DELETE",
    }).then(parse_response);
}

async function method_create_role(description) {
    return await fetch(`${base}/adm/role`, {
        method: "PUT",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(description),
    }).then(parse_response);
}

async function method_get_role_users(id) {
    return await fetch(`${base}/adm/role/${id}/users`, { cache: "no-store" }).then(parse_response);
}

async function method_get_role_permissions(id) {
    return await fetch(`${base}/adm/role/${id}/permissions`, { cache: "no-store" }).then(parse_response);
}

async function method_change_role_permissions(id, permissions_change) {
    return await fetch(`${base}/adm/role/${id}/permissions`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(permissions_change),
    }).then(parse_response);
}

async function method_get_permissions() {
    return await fetch(`${base}/adm/permissions`, { cache: "no-store" }).then(parse_response);
}

async function method_get_permission(id) {
    return await fetch(`${base}/adm/permission/${id}`, { cache: "no-store" }).then(parse_response);
}

async function method_get_permission_roles(id) {
    return await fetch(`${base}/adm/permission/${id}/roles`, { cache: "no-store" }).then(parse_response);
}

async function method_edit_permission(id, permission) {
    return await fetch(`${base}/adm/permission/${id}`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(permission),
    }).then(parse_response);
}

async function method_delete_permission(id) {
    return await fetch(`${base}/adm/permission/${id}`, {
        method: "DELETE",
    }).then(parse_response);
}

async function method_create_permission(permission) {
    return await fetch(`${base}/adm/permission`, {
        method: "PUT",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(permission),
    }).then(parse_response);
}

async function method_get_self() {
    return await fetch(`${base}/adm/self`, { cache: "no-store" }).then(parse_response);
}

let escaper = document.createElement('div');
function escapeHTML(html) {
    escaper.innerText = html;
    return escaper.innerHTML;
}

let validator = /^[A-Za-z0-9_-]{1,30}$/;

let dialog = document.querySelector("dialog");
let cached_roles = {};
let cached_perms = {};
let cached_users = {};
let Self = null;

class Permission {
    constructor(data) {
        this._set_data(data);
    }
    _set_data(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
    }
    html_repr() {
        return `
        <span class="permission-repr">
            <span class="permission-id">${this.id}</span>
            <span class="permission-name">${escapeHTML(this.name)}</span>
            <span class="permission-description">${escapeHTML(this.description)}</span>
        </span>
        `;
    }
    edit() {
        dialog.className = "";
        dialog.classList.add("permission");
        dialog.innerHTML=`
            <input type="text" name="name" placeholder="Name">
            <input type="text" name="description" placeholder="Description">
            <div class="roles"></div>
            <button class="update">Update</button>
            <button class="delete">Delete</button>
            <button class="cancel">Cancel</button>
        `;
        let name_input = dialog.querySelector("input[name=name]");
        let descr_input = dialog.querySelector("input[name=description]");
        name_input.value = this.name;
        descr_input.value = this.description;
        let T = this;
        T.get_roles().then(roles=>{
            let role_container = dialog.querySelector(".roles");
            role_container.innerHTML = '';
            for(let role of roles) {
                let el = document.createElement("div");
                el.classList.add("permission-role");
                el.innerHTML = `
                    ${role.html_repr()}
                    <input class="permission-role-add" type=checkbox name=permission_role_${role.id} value=${role.id} data-id=${role.id} checked>
                `;
                role_container.appendChild(el);
            }
        }).catch(console.error);
        dialog.querySelector("button.update").addEventListener("click", ev=>{
            let new_name = name_input.value.trim();
            let new_desc = descr_input.value.trim();
            let promises = [];
            if(T.name != new_name || T.description != new_desc) {
                if(!validator.test(new_name)) {
                    alert("Name validation failed");
                    return;
                }
                T.name = new_name;
                T.description = new_desc;
                promises.push(T._save_self());
            }
            for(let role_el of dialog.querySelectorAll(".roles input.permission-role-add:not(:checked)")) {
                let role = cached_roles[parseInt(role_el.dataset.id)];
                if(role)
                    promises.push(role.remove_permission(T.id));
            }
            Promise.all(promises).then(()=>{
                T.edit();
            }).catch(console.error);
        });
        dialog.querySelector("button.delete").addEventListener("click", ev=>{
            T.delete().then(()=>{
                dialog.close();
                fill_permissions()
            }).catch(e=>{
                if(e.message.startsWith("409|787")) {
                    alert(e.message);
                } else {
                    console.log(e);
                }
            });
        });
        dialog.querySelector("button.cancel").addEventListener("click", ev=>{
            dialog.close();
            fill_permissions()
        });
        if(!dialog.open)
            dialog.showModal();
    }
    async get_roles() {
        let roles_raw = await method_get_permission_roles(this.id);
        let ret = [];
        for(let role_raw of roles_raw.roles) {
            let role = cached_roles[role_raw.id];
            if(role) {
                ret.push(role);
            }
        }
        return ret;
    }
    async delete() {
        let result = await method_delete_permission(this.id);
        if(result.success) {
            delete cached_perms[this.name];
        }
    }
    async _save_self() {
        let data = await method_edit_permission(this.id, {
            id: this.id,
            name: this.name,
            description: this.description,
        });
        this._set_data(data);
    }
    async set_description(new_description) {
        this.description = new_description;
        await this._save_self();
    }
    async set_name(new_name) {
        this.name = new_name;
        await this._save_self();
    }
}
Permission.get_all = async function get_all_permissions() {
    let perms_raw = await method_get_permissions();
    let perms = [];
    for(let perm_raw of perms_raw.permissions) {
        let perm = new Permission(perm_raw);
        perms.push(perm);
    }
    return perms;
}
Permission.get = async function get_permission(id) {
    let perm_raw = await method_get_permission(id);
    return new Permission(perm_raw);
}
Permission.create = async function create_permission(name, description) {
    let perm_raw = await method_create_permission({
        name: name,
        description: description,
        id: -1,
    });
    return new Permission(perm_raw);
}

class Role{
    constructor(data) {
        this._set_role_from_raw(data);
    }
    text_repr() {
        let shareable = '';
        if(this.is_shareable === !!this.is_shareable) {
            shareable = this.is_shareable ? " S" : " -";
        }
        return `Role(${this.id}|${this.name}${shareable}) — ${this.description}`;
    }
    html_repr() {
        let shareable = '';
        if(this.is_shareable === !!this.is_shareable) {
            let shareable_text = this.is_shareable ? "yes" : "no";
            shareable = `<span class="role-shareable role-shareable-${shareable_text}">${shareable_text}</span>`;
        }
        return `<span class="role-repr">
            <span class="role-id">${this.id}</span>
            <span class="role-name">${escapeHTML(this.name)}</span>
            <span class="role-description">${escapeHTML(this.description)}</span>
            ${shareable}
        </span>`;
    }
    _set_role_from_raw(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
    }
    edit() {
        let T = this;

        dialog.className = "";
        dialog.classList.add("role");
        dialog.innerHTML=`
            <input type=text name=name placeholder="Name">
            <input type="text" name="description" placeholder="Description">
            <input type="text" name="permission_filter" placeholder="search...">
            <div class="permissions"></div>
            <button class="save">Update</button>
            <button class="delete">Delete</button>
            <button class="users">Users</button>
            <dialog class="sub-dialog">
                <div class="sub-container"></div>
                <button class="sub-update">Update</button>
                <button class="sub-close">Close</button>
            </dialog>
            <button class="close">Close</button>
        `;
        let name_input = dialog.querySelector("input[name=name]");
        let desc_input = dialog.querySelector("input[name=description]");
        let perm_filter = dialog.querySelector("input[name=permission_filter]");
        let perms_container = dialog.querySelector(".permissions");
        let fliter_perms = function() {
            let filter = perm_filter.value.trim();
            for(let perm of perms_container.querySelectorAll("label")){
                if(filter == "" || perm.dataset.permissionName.startsWith(filter)){
                    perm.classList.remove("hidden");
                }else{
                    perm.classList.add("hidden");
                }
            }
        }
        let update_perms = function(){
            perms_container.innerHTML = "";
            for(let perm_id in cached_perms) {
                let perm = cached_perms[perm_id];
                let el = document.createElement('label');
                el.dataset.permissionName=perm.name;
                el.dataset.permissionId=perm.id;
                let checked = perm.name in T.permissions? "checked": "";
                el.innerHTML = `
                    <input type=checkbox value=${perm.name} name=${perm.name} data-id=${perm.id} class=perm_toggle ${checked}>
                    ${perm.html_repr()}
                `;
                perms_container.appendChild(el);
            }
            fliter_perms();
        }
        T.get_permissions().then(
            update_perms
        ).catch(console.error);
        perm_filter.addEventListener("input", ev=>{
            fliter_perms();
        });

        name_input.value = this.name;
        desc_input.value = this.description;
        dialog.querySelector("button.save").addEventListener("click", ev=>{
            let name = name_input.value.trim();
            let desc = desc_input.value.trim();
            if(!validator.test(name)) {
                alert("bad role name");
                return;
            }
            if(T.name != name || T.description != desc) {
                T.name = name;
                T.description = desc;
                T._save_self().then(t=>{
                    T.edit()
                }).catch(console.error);
            }
            let to_remove = [];
            let to_add = [];
            for(let perm_el of perms_container.querySelectorAll("input")) {
                if(perm_el.name in T.permissions && !perm_el.checked) {
                    to_remove.push(parseInt(perm_el.dataset.id));
                }
                if(!(perm_el.name in T.permissions) && perm_el.checked) {
                    to_add.push(parseInt(perm_el.dataset.id));
                }
            }
            if(to_add.length > 0 || to_remove.length > 0) {
                method_change_role_permissions(T.id, {
                    "add": to_add,
                    "remove": to_remove,
                }).then(perms_raw=>{
                    T._set_permissions_raw(perms_raw.permissions);
                    T.edit()
                }).catch(console.error);
            }
        });
        dialog.querySelector("button.close").addEventListener("click", ev=>{
            dialog.close();
        });
        async function show_role_users() {
            let users_dlg = dialog.querySelector(".sub-dialog");
            let container = users_dlg.querySelector(".sub-container");
            let users = await T.get_users();

            let promises = [];
            for(let user of users) {
                if(!user.shareable) {
                    promises.push(user.get_roles());
                }
            }
            if(promises.length > 0) 
                await Promise.all(promises);
            
            container.innerHTML = "";
            for(let user of users) {
                let el = document.createElement("div");
                el.classList.add('role-user');
                let share_checked = T.id in user.shareable ? "checked" : "";
                el.innerHTML = `
                    ${user.html_repr()}
                    <input type=checkbox title="User has this role" data-id=${user.id} class=role_sub_user_add name=user_role_${user.id} value=${user.id} checked>
                    <input type=checkbox title="User can share this role" data-id=${user.id} class=role_sub_user_share name=user_role_${user.id}_share value=${user.id} ${share_checked}>
                `;
                container.appendChild(el);
            }
            users_dlg.querySelector("button.sub-close").addEventListener("click", ()=>{
                users_dlg.close();
            });
            users_dlg.querySelector("button.sub-update").addEventListener("click", ()=>{
                let users = container.querySelectorAll("input.role_sub_user_add");
                let promises = [];
                for(let el of users) {
                    let user = cached_users[parseInt(el.dataset.id)];
                    let checked = el.checked;
                    let shareable = !!(container.querySelector(`input.role_sub_user_share[data-id="${user.id}"]:checked`));
                    if(user) {
                        if(!checked) {
                            promises.push(user.remove_role(T.name));
                        } else if(shareable != (T.id in user.shareable)) {
                            promises.push(user.add_role(T.name, shareable));
                        }
                    }
                }
                if(promises.length > 0) {
                    Promise.all(promises).then(()=>show_role_users()).catch(console.error);
                }
            });
            if(!users_dlg.open)
                users_dlg.showModal();
        }
        dialog.querySelector("button.users").addEventListener("click", ev=>{
            show_role_users().catch(console.error);
        });
        dialog.querySelector("button.delete").addEventListener("click", ev=>{
            T.delete().then(()=>{
                dialog.close();
                fill_roles()
            }).catch(e=>{
                if(e.message.startsWith("409|787")) {
                    alert(e.message);
                } else {
                    console.log(e);
                }
            });
        });
        if(!dialog.open)
            dialog.showModal();
    }
    async get_users() {
        let users_raw = await method_get_role_users(this.id);
        let ret = [];
        for(let user_raw of users_raw.users) {
            let user = cached_users[user_raw.id];
            if(!user) continue;
            ret.push(user);
        }
        return ret;
    }
    async delete() {
        let result = await method_delete_role(this.id);
        if(result.success) {
            delete cached_roles[this.id];
        }
    }
    async _save_self() {
        let role_raw = await method_edit_role(this.id, {
            id: this.id,
            name: this.name,
            description: this.description, 
        });
        this._set_role_from_raw(role_raw);
    }
    async set_description(new_description) {
        this.description = new_description;
        await this._save_self();
    }
    async set_name(new_name) {
        this.name = new_name;
        await this._save_self();
    }
    _set_permissions_raw(perms_raw) {
        let perms = {};
        for(let perm_raw of perms_raw) {
            let perm = cached_perms[perm_raw.name];
            if(perm)
                perms[perm.name] = perm;
        }
        this.permissions = perms;
    }
    async get_permissions() {
        let perms_raw = await method_get_role_permissions(this.id);
        this._set_permissions_raw(perms_raw.permissions);
        return this.permissions;
    }
    async add_permission(permission_id) {
        let perms_raw = await method_change_role_permissions(this.id, {
            "add": [permission_id],
            "remove": [],
        });
        this._set_permissions_raw(perms_raw.permissions);
        return this.permissions;
    }
    async remove_permission(permission_id) {
        let perms_raw = await method_change_role_permissions(this.id, {
            "add": [],
            "remove": [permission_id],
        });
        this._set_permissions_raw(perms_raw.permissions);
        return this.permissions;
    }
}
Role.create = async function create_role(name, description){
    let role_raw = await method_create_role({
        name: name,
        description: description,
        id: -1,
    });
    return new Role(role_raw);
}
Role.get = async function get_role(id){
    let role_raw = await method_get_role(id);
    return new Role(role_raw);
}
Role.get_all = async function get_roles() {
    let roles_raw = await method_get_roles();
    let roles = [];
    for(let role_raw of roles_raw.roles) {
        let role = new Role(role_raw);
        roles.push(role);
    }
    return roles;
}

const ROLE_SET = 1;
const ROLE_SHAREABLE = 2;
const ROLE_UNSET = 0;

class User{
    constructor(data) {
        this.id = data.id;
        this.outer_id = data.outer_id;
        this.issuer = data.issuer;
        this.data = data.data;
        this.su = false;
    }
    text_repr() {
        let outer_data = "";
        switch(this.issuer) {
            case "telegram":
                outer_data = `: ${this.data.username} (${this.data.first_name} ${this.data.last_name})`;
                break;
            case "google":
                outer_data = `: ${this.data.email}`;
                break;
        }
        return `User(${this.id}): ${this.issuer}(${this.outer_id})${outer_data}`;
    }
    html_repr() {
        let outer_data = "";
        switch(this.issuer) {
            case "telegram":
                outer_data = `
                    <span class="user-telegram-username">${escapeHTML(this.data.username)}</span>
                    <span class="user-telegram-fullname">${escapeHTML(this.data.first_name)} ${escapeHTML(this.data.last_name)}</span>
                `;
                break;
            case "google":
                outer_data = `
                <span class="user-google-email">${escapeHTML(this.data.email)}</span>
                `;
                break;
        }
        return `
            <span class="user-repr">
                <span class="user-id">${this.id}</span>
                <span class="user-issuer">${escapeHTML(this.issuer)}</span>
                <span class="user-outer-id">${escapeHTML(this.outer_id)}</span>
                <span class="user-outer-data">${outer_data}</span>
            </span>
        `;
    }
    edit() {
        let T = this;

        dialog.className = "";
        dialog.classList.add("user");
        dialog.innerHTML=`
            <input type=text name=role_filter placeholder="search...">
            <div class="roles"></div>
            <button class="save">Update</button>
            <button class="close">Close</button>
        `;
        let roles_container = dialog.querySelector(".roles");
        let roles_filter = dialog.querySelector("input[name=role_filter]");
        let filter_roles = function() {
            let filter = roles_filter.value.trim();
            for(let el of roles_container.querySelectorAll(".role_row")) {
                if(filter == "" || el.dataset.roleName.startsWith(filter)) {
                    el.classList.remove("hidden");
                }else{
                    el.classList.add("hidden");
                }
            }
        };
        let update_roles = function() {
            roles_container.innerHTML = "";
            for(let role_id in cached_roles) {
                let role = cached_roles[role_id];
                let el = document.createElement("div");
                el.classList.add("role_row");
                el.dataset.roleId = role.id;
                el.dataset.roleName = role.name;
                let disabled = role.id in Self.shareable || Self.su ? "" : "disabled";
                let checked_role = role.id in T.roles? "checked" : "";
                let shareable_role = role.id in T.shareable ? "checked" : "";
                if(role.name == "su" && !(role.id in Self.shareable)) {
                    disabled = "disabled";
                }
                el.innerHTML = `
                    <label>
                        ${role.html_repr()}
                        <input ${disabled} ${checked_role} type=checkbox title="User has this role" data-role=${role.id} class="role_add" name=role_add_${role.id}>
                    </label>
                    <input ${disabled} ${shareable_role} type=checkbox title="User can share this role" data-role=${role.id} class="role_share" name=role_share_${role.id}>
                `;
                roles_container.appendChild(el);
            }
            filter_roles();
        };
        roles_filter.addEventListener("input", ev=>{
            filter_roles();
        });
        T.get_roles().then(r=>{
            update_roles()
        }).catch(console.error);

        dialog.querySelector("button.save").addEventListener("click", ev=>{
            let roles = [];
            for(let role_row of roles_container.querySelectorAll(".role_row")) {
                let role_id = parseInt(role_row.dataset.roleId);
                let role_name = role_row.dataset.roleName;
                let role_add = role_row.querySelector(".role_add:checked");
                if(role_add) {
                    let role_share = role_row.querySelector(".role_share:checked");
                    if(!(role_id in T.roles) || !role_share || !(role_id in T.shareable)) {
                        roles.push({
                            name: role_name,
                            action: ROLE_SET | (role_share? ROLE_SHAREABLE : 0)
                        });
                    }
                }else if(role_id in T.roles) {
                    roles.push({
                        name: role_name,
                        action: ROLE_UNSET
                    });
                }
            }
            if(roles.length > 0) {
                method_change_user_roles(T.id, {
                    roles: roles
                }).then(roles_raw=>{
                    T._update_roles(roles_raw.roles);
                    T.edit()
                }).catch(console.error);
            }
        });

        dialog.querySelector("button.close").addEventListener("click", ev=>{
            dialog.close();
        });
        if(!dialog.open)
            dialog.showModal();
    }
    _update_roles(roles_raw) {
        let roles = {};
        let shareable = {};
        this.su = false;
        for(let role_raw of roles_raw) {
            let role = cached_roles[role_raw.id];
            if(!role) continue;
            if(role.name == "su") {
                this.su = true;
            }
            roles[role.id] = role;
            if(role_raw.shareable) {
                shareable[role.id] = role;
            }
        }
        this.roles = roles;
        this.shareable = shareable;
    }
    async get_roles() {
        let roles_raw = await method_get_user_roles(this.id);
        this._update_roles(roles_raw.roles);
        return this.roles;
    }
    async add_role(role_name, shareable=false) {
        let action = ROLE_SET;
        if(shareable) action |= ROLE_SHAREABLE;
        let roles_raw = await method_change_user_roles(this.id, {
            roles: [{
                name: role_name,
                action: action,
            }]
        });
        this._update_roles(roles_raw.roles);
        return this.roles;
    }
    async remove_role(role_name) {
        let roles_raw = await method_change_user_roles(this.id, {
            roles: [{
                name: role_name,
                action: ROLE_UNSET,
            }]
        });
        this._update_roles(roles_raw.roles);
        return this.roles;
    }
}
User.get_all = async function get_users() {
    let users_raw = await method_get_users();
    let users = [];
    for(let user_raw of users_raw.users) {
        let user = new User(user_raw);
        users.push(user);
    }
    return users;
};
User.get_self = async function get_self() {
    let user_raw = await method_get_self();
    return new User(user_raw.self);
};

let main_container = document.querySelector("main");
let fill_roles_promise;
Promise.all([
    fill_roles(),
    User.get_self().then(u=>Self=u)
]).then(u=>{
    Self.get_roles()
}).catch(console.error);

async function fill_users() {
    let users = await User.get_all();
    let container = document.querySelector("#menu_btn_users+div");
    container.innerHTML="";
    cached_users = {};
    for(let user of users) {
        cached_users[user.id] = user;
        let user_el = document.createElement("div");
        user_el.classList.add("user");
        user_el.addEventListener("click", user.edit.bind(user));
        user_el.innerHTML = user.html_repr();
        container.appendChild(user_el);
    }
}
async function fill_roles() {
    let roles = await Role.get_all();
    let container = document.querySelector("#menu_btn_roles+div .roles");
    container.innerHTML="";
    cached_roles = {};
    for(let role of roles) {
        cached_roles[role.id] = role;
        let role_el = document.createElement("div");
        role_el.classList.add("role");
        role_el.addEventListener("click", role.edit.bind(role));
        role_el.innerHTML = role.html_repr();
        container.appendChild(role_el);
    }
}
async function fill_permissions() {
    let permissions = await Permission.get_all();
    let container = document.querySelector("#menu_btn_permissions+div .permissions");
    container.innerHTML="";
    cached_perms={};
    for(let perm of permissions) {
        cached_perms[perm.name] = perm;
        let el = document.createElement("div");
        el.classList.add("permission");
        el.addEventListener("click", perm.edit.bind(perm));
        el.innerHTML = perm.html_repr();
        container.appendChild(el);
    }
}

document.querySelector("label[for=menu_btn_users]").addEventListener("click", ev=>fill_users().catch(console.error));
document.querySelector("label[for=menu_btn_roles]").addEventListener("click", ev=>fill_roles().catch(console.error));
document.querySelector("label[for=menu_btn_permissions]").addEventListener("click", ev=>fill_permissions().catch(console.error));

fill_users().catch(console.error);
fill_permissions().catch(console.error);

document.querySelector("#menu_btn_roles+div .create").addEventListener("click", ev=>{
    let name = document.querySelector("#menu_btn_roles+div input[name=name]").value.trim();
    let description = document.querySelector("#menu_btn_roles+div input[name=description]").value.trim();
    if(!validator.test(name)) {
        alert("bad role name");
        return;
    }
    
    Role.create(name.trim(), description.trim()).then(
        r=>fill_roles()
    ).catch(console.error);
});

document.querySelector("#menu_btn_permissions+div .create").addEventListener("click", ev=>{
    let name = document.querySelector("#menu_btn_permissions+div input[name=name]").value.trim();
    let description = document.querySelector("#menu_btn_permissions+div input[name=description]").value.trim();
    if(!validator.test(name)) {
        alert("bad permission name");
        return;
    }
    
    Permission.create(name.trim(), description.trim()).then(
        r=>fill_permissions()
    ).catch(console.error);
});

