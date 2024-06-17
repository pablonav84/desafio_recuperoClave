import { Router } from "express";
import { usuariosMongoDAO } from "../dao/usuariosMongoDAO.js";
import { RolesManager } from "../dao/rolesMongoDAO.js";
import { ProductsManager } from "../dao/productosMongoDAO.js";
import { generaHash, passportCall } from "../utils.js";
import { auth } from "../middleware/auth.js";

export const router = Router()
const usuariosDAO = new usuariosMongoDAO()
const rolesDAO = new RolesManager()
const productosDAO = new ProductsManager()

router.put('/usuario/:uid', async(req,res)=>{
    const { uid } = req.params;
    const { rol } = req.body;

  try {
    
    if (rol !== 'usuario' && rol !== 'premium') {
      return res.status(400).json({ message: 'Solo se admiten los roles usuario y premium' });
    }
    const usuario = await usuariosDAO.getBy({_id:uid});

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    const rolEncontrado = await rolesDAO.getRolBy(usuario.rol);
    
    if (!rolEncontrado) {
      return res.status(404).json({ message: 'Rol no encontrado' });
    }
    rolEncontrado.descrip = rol;

    await rolEncontrado.save();

    return res.json(`El rol fue modificado exitosamente a ${rol}`);
  } catch (error) {
    return res.status(500).json({ message: 'Error al modificar el rol' });
  }
})


router.post('/producto', passportCall("jwt"), auth(["usuario", "admin", "premium"]), async (req, res) => {
    const userId = req.user._id;
  
    let {
      title,
      description,
      price,
      thumbnail,
      code,
      stock,
      category,
      password,
    } = req.body;
  
    try {
      let existCode = await productosDAO.getProductBy({ code });
      if (existCode) {
        req.logger.warning(`Código Existente en BD`);
        return res.status(400).json({
          message: 'Ya existe un producto con el mismo código',
        });
      }
      password = generaHash(password);
  
      // Verificar si el usuario tiene un rol premium
      const user = await usuariosDAO.getBy({ _id: userId });
  
  const rolEncontrado = await rolesDAO.getRolBy(user.rol);
  
      let owner = ''; // Inicializar el campo "owner" como vacío
  
      if (rolEncontrado.descrip === 'premium') {
        
        owner = userId; // Asignar el ID del usuario si es premium
      }
  
      let nuevoProducto = await productosDAO.addProduct({
        title,
        description,
        price,
        thumbnail,
        code,
        stock,
        category,
        owner,
        password,
      });
      res.setHeader('Content-Type', 'application/json');
      return res.status(201).json({ nuevoProducto: nuevoProducto });
    } catch (error) {
      console.log(error)
      return res.status(500).json({
        message: 'Error al crear el producto',
      });
    }
  });
  