import { Request, Response, NextFunction } from "express";
import { IUser } from "../models/User";

// Reference: https://blog.nodeswat.com/implement-access-control-in-node-js-8567e7b484d1

interface Access {
    name: string;
    when?: (params: any) => boolean;
}

interface Role {
    can: Access[];
    canMap?: any;
    extends?: string[];
}

interface RoleAccess {
    [propname: string]: Role;
}


// Pre-defined roles access master list
// TODO: update the master list for each new modules accordingly
const roles: RoleAccess = {
    guest: {
        can: [{ name: "user:login" }]
    },
    admin_1: {
        can: [{ name: "adminJob:list" }],
        extends: ["guest"]
    },
    admin_2: {
        can: [
            { name: "recruiter:list" },
            { name: "creditAccount:list" },
        ],
        extends: ["admin_1"]
    },
    admin_99: {
        can: [{ name: "user:signup" }],
        extends: ["admin_2"]
    }
};

class RBAC {
    roles: RoleAccess;
    constructor(roles: any) {
        this.roles = roles;
        this.initRoleAccess();
    }
    initRoleAccess(): void {
        Object.keys(this.roles).forEach(roleKey => {
            const roleAccess = this.roles[roleKey];

            const canMap: any = {};
            if (roleAccess.can) {
                roleAccess.can.forEach(operation => {
                    canMap[operation.name] = operation;
                });
                roleAccess.canMap = canMap;
            }
        });
    }
    can(roleKeys: string[], accessName: string, params: any): boolean {
        return roleKeys.some(roleKey => {
            // check if role exist
            if (!this.roles[roleKey]) {
                return false;
            }
            const roleAccess = this.roles[roleKey];

            // check if current role has access
            if (roleAccess.canMap[accessName]) {
                const access = roleAccess.canMap[accessName];
                if (!access.when)
                    return true;
                else {
                    return access.when(params);
                }
            }

            // continue to check if any parents
            if (roleAccess.extends && roleAccess.extends.length > 0) {
                // check parent role(s) until one returns true or all return false
                return this.can(roleAccess.extends, accessName, params);
            }

            // all else
            return false;
        });
    }
}

const rbac = new RBAC(roles);
export default rbac;

/**
 * Access Control middleware.
 */
export let hasAccess = (accessName: string, params?: any) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as IUser;
        // TODO: handle params
        // TODO: use promise
        if (user.hasAccess(accessName, params)) {
            next();
        } else {
            req.flash("errors", { msg: "Unauthorized Access! Please contact Administrator." });
            res.redirect("/");
        }
    };
};
