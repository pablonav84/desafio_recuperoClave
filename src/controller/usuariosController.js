import { isValidObjectId } from "mongoose";
import { usuariosService } from "../services/usuarios.service.js";
import { ERRORES } from "../utils/erroresIndice.js";
import { generaHash } from "../utils.js";
import ErrorHandlers from "../utils/errorUsuarios.js";
import CustomError from "../utils/errorCustom.js";
import { rolesService } from "../services/roles.service.js";

  async function getUsuarios (req, res) {
    let usuarios = await usuariosService.getAllUsuarios();

    res.setHeader("Content-Type", "application/json");
    res.status(200).json({ usuarios });
  };


  async function getUsuariosDTO (req, res) {
    try {
      const usuariosDTO = await usuariosService.getUsersDTO();
      res.json(usuariosDTO);
    } catch (error) {
      req.logger.fatal(`Error Indeterminado`, error);
      res.status(500).json({
        message: "error al obtener usuario",
        error: ERRORES['INDETERMINADO']
    });
    }
  };


  async function getUsuarioById (req, res) {
    let { id } = req.params;
    try {
      if (!isValidObjectId(id)) {
        req.logger.error(`Id Inválido`);
        throw CustomError.createError({
          name: "Id Inválido",
          cause: ErrorHandlers.idInvalido(req.params),
          message: `Ingrese un Id de Mongo Válido`,
          code: ERRORES['BAD REQUEST']
        });
      }
      let usuario = await usuariosService.getUsuarioById({ _id: id });
      if (!usuario) {
        req.logger.error(`Id Inexistente`);
        throw CustomError.createError({
          name: "Id Inexistente",
          message: "El Id ingresado pertenece a un producto inexistente",
          code: ERRORES['NOT FOUND']
        });
      }
      res.setHeader("Content-Type", "application/json");
      res.status(200).json({ usuario });
    } catch (error) {
      req.logger.fatal(`Error Indeterminado`, error);
      return res.status(500).json({
        name: error.name,
        message: error.message,
        cause: error.cause,
        code: error.code
      });
    }  
  };


  async function create(req, res) {
    let { nombre, apellido, edad, email, password } = req.body;

    try {
      ErrorHandlers.handleFieldError('nombre', nombre, req.body);
      ErrorHandlers.handleFieldError('apellido', apellido, req.body);
      ErrorHandlers.handleFieldError('edad', edad, req.body);
      ErrorHandlers.handleFieldError('email', email, req.body);
      ErrorHandlers.handleFieldError('password', password, req.body);
  
      let existe = await usuariosService.getUsuarioByEmail({ email });
      if (existe) {
        req.logger.warning(`Email existente en DB`);
        CustomError.createError({
          error: "Email Existente en BD",
          message: `Ya fue registrado el email ${email}`,
          code: ERRORES['CODIGO_EXISTENTE']
        });
      }
  
      password = generaHash(password);
  
      let nuevoUsuario = await usuariosService.crearUsuario({
        nombre,
        apellido,
        edad,
        email,
        password,
      });
      res.setHeader("Content-Type", "application/json");
      return res.status(201).json({ nuevoUsuario });
    } catch (error) {
      req.logger.fatal(`Error Indeterminado`, error);
      (error.name === "Error al crear usuario")
        return res.status(500).json({
          error: error.name,
          cause: error.cause,
          message: error.message,
          code: error.code
        });
    }
  }  

  
  async function premium(req, res) {
    const { uid } = req.params;
    const { rol } = req.body;

  try {
    
    if (rol !== 'usuario' && rol !== 'premium') {
      return res.status(400).json({ message: 'Solo se admiten los roles usuario y premium' });
    }
    const usuario = await usuariosService.getUsuarioById({_id:uid});

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    const rolEncontrado = await rolesService.getRol(usuario.rol);
    
    if (!rolEncontrado) {
      return res.status(404).json({ message: 'Rol no encontrado' });
    }
    rolEncontrado.descrip = rol;

    await rolEncontrado.save();

    return res.json(`El rol fue modificado exitosamente a ${rol}`);
  } catch (error) {
    return res.status(500).json({ message: 'Error al modificar el rol' });
  }
  }

  export default {getUsuarios, getUsuariosDTO, getUsuarioById, create, premium}