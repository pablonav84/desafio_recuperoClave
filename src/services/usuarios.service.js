import { DAO } from "../dao/factory.js"


class UsuariosService{
    constructor(dao){
        this.dao= new dao()
    }
    async getAllUsuarios(){
        return await this.dao.getAll()
    }
    async getUsersDTO(){
        return await this.dao.getDTO()
    }
    async getUsuarioByEmail(email){
        
        return await this.dao.getBy(email)
    }
    async getUsuarioById(id){
        return await this.dao.getBy(id)
    }
    async getSinLean(id){
        return await this.dao.getBySinLean({_id:id})
    }
    async actualizaUsuario(id, datosActualizados){
        return await this.dao.updateUsuario(id, datosActualizados);
    } 
    async crearUsuario(usuario){
        return await this.dao.create(usuario)
    }
}

export const usuariosService=new UsuariosService(DAO)