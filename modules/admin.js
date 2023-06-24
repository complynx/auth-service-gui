let base = "/auth"

async function method_get_users() {
    return await fetch(`${base}/adm/users`).then(r=>r.json());
}

async function method_get_user_roles(id) {
    return await fetch(`${base}/adm/user/${id}/roles`).then(r=>r.json());
}

async function method_change_user_roles(id, roles_change) {
    return await fetch(`${base}/adm/user/${id}/roles`, {
        method: "POST",
        body: JSON.stringify(roles_change),
    }).then(r=>r.json());
}

async function method_get_roles() {
    return await fetch(`${base}/adm/roles`).then(r=>r.json());
}

async function method_get_role(id) {
    return await fetch(`${base}/adm/role/${id}`).then(r=>r.json());
}

async function method_edit_role(id, description) {
    return await fetch(`${base}/adm/role/${id}`, {
        method: "POST",
        body: JSON.stringify(description),
    }).then(r=>r.json());
}

async function method_create_role(description) {
    return await fetch(`${base}/adm/role`, {
        method: "PUT",
        body: JSON.stringify(description),
    }).then(r=>r.json());
}

async function method_get_role_permissions(id) {
    return await fetch(`${base}/adm/role/${id}/permissions`).then(r=>r.json());
}

async function method_change_role_permissions(id, permissions_change) {
    return await fetch(`${base}/adm/role/${id}/permissions`, {
        method: "POST",
        body: JSON.stringify(permissions_change),
    }).then(r=>r.json());
}

async function method_get_permissions() {
    return await fetch(`${base}/adm/permissions`).then(r=>r.json());
}

async function method_get_permission(id) {
    return await fetch(`${base}/adm/permission/${id}`).then(r=>r.json());
}

async function method_edit_permission(id, permission) {
    return await fetch(`${base}/adm/permission/${id}`, {
        method: "POST",
        body: JSON.stringify(permission),
    }).then(r=>r.json());
}

async function method_create_permission(permission) {
    return await fetch(`${base}/adm/permission`, {
        method: "PUT",
        body: JSON.stringify(permission),
    }).then(r=>r.json());
}

async function method_get_self() {
    return await fetch(`${base}/adm/self`).then(r=>r.json());
}

class Permission {
    constructor(data) {
        this._set_data(data);
    }
    _set_data(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
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
    let perms_raw = await method_get_permissions().permissions;
    let perms = [];
    for(let perm_raw of perms_raw) {
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
    });
    return new Permission(perm_raw);
}

class Role{
    constructor(data) {
        this._set_role_from_raw(data);
        this.is_shareable = data.shareable;
    }
    _set_role_from_raw(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
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
        let perms = [];
        for(let perm_raw of perms_raw) {
            let perm = new Permission(perm_raw);
            perms.push(perm);
        }
        this.permissions = perms;
    }
    async get_permissions() {
        let perms_raw = await method_get_role_permissions(this.id).permissions;
        this._set_permissions_raw(perms_raw);
        return this.permissions;
    }
    async add_permission(permission_id) {
        let perms_raw = await method_change_role_permissions(this.id, {
            "add": [permission_id],
            "remove": [],
        }).permissions;
        this._set_permissions_raw(perms_raw);
        return this.permissions;
    }
    async remove_permission(permission_id) {
        let perms_raw = await method_change_role_permissions(this.id, {
            "add": [],
            "remove": [permission_id],
        }).permissions;
        this._set_permissions_raw(perms_raw);
        return this.permissions;
    }
}
Role.create = async function CreateRole(name, description){
    let role_raw = await method_create_role({
        name: name,
        description: description,
    });
    return Role(role_raw);
}
Role.get = async function CreateRole(id){
    let role_raw = await method_get_role(id);
    return Role(role_raw);
}
Role.get_all = async function get_roles() {
    let roles_raw = await method_get_roles().roles;
    let roles = [];
    for(let role_raw of roles_raw) {
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
    }
    _update_roles(roles_raw) {
        let roles = [];
        for(let role_raw of roles_raw) {
            let role = new Role(role_raw);
            roles.push(role);
        }
        this.roles = roles;
    }
    async get_roles() {
        let roles_raw = await method_get_user_roles(this.id).roles;
        this._update_roles(roles_raw);
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
        this._update_roles(roles_raw);
        return this.roles;
    }
    async remove_role(role_name) {
        let roles_raw = await method_change_user_roles(this.id, {
            roles: [{
                name: role_name,
                action: ROLE_UNSET,
            }]
        });
        this._update_roles(roles_raw);
        return this.roles;
    }
}
User.get_all = async function get_users() {
    let users_raw = await method_get_users().users;
    let users = [];
    for(let user_raw of users_raw) {
        let user = new User(user_raw);
        users.push(user);
    }
    return users;
};
User.get_self = async function get_self() {
    let user_raw = await method_get_self().self;
    return new User(user_raw);
};

User.get_self().then(console.log, console.error);
User.get_all().then(console.log, console.error);
Role.get_all().then(console.log, console.error);
Permission.get_all().then(console.log, console.error);
