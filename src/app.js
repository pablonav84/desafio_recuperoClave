import express from 'express';
import passport from 'passport';
import { engine } from "express-handlebars";
import cookieParser from 'cookie-parser';
import path from "path";
import { Server } from 'socket.io';
import cluster from "cluster";
import os from "os";
import {fakerES_MX as faker} from '@faker-js/faker'
import { initPassport } from './config/passport.config.js';
import { UsuariosRouter } from "./routes/router/usuariosRouter.js";
import { router as sessionsRouter } from './routes/sessionsRouter.js';
import { router as carritosRouter } from './routes/carritosRouter.js';
import { ProductosRouter } from './routes/router/productosRouter.js';
import { config } from './config/config.js';
import __dirname, { logger, middLogg } from "./utils.js";
import {router as vistasRouter} from "./routes/vistasRouter.js"
import { router as mailRouter } from "./routes/mailRouter.js"
import { ChatManager } from './dao/chatManagerMongo.js';
import { router as mockingRouter } from "./routes/mockingRouter.js"; 
import { router as testLogs } from "./routes/testLogs.js"
import { router as pruebasRouter } from "./routes/pruebasRouter.js"


if(cluster.isPrimary){
    console.log(os.cpus())
    console.log(`Soy el proceso primary, con id ${process.pid}, y voy a generar nodos...`)
    for(let i=0; i<os.cpus().length; i++){
        cluster.fork()
    }

    cluster.on("message", (worker, message)=>{
        console.log("Primario escucho:", worker.id, message)
    })

    cluster.on("disconnect", worker=>{
        console.log(`El worker ${worker.id} se ha desconectado... generando nuevo worker`)
        cluster.fork()
    })
}else
{
const PORT = config.PORT;
let io;
const app = express();

const usuariosRouter=new UsuariosRouter()
const productosRouter=new ProductosRouter()

app.use(middLogg)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.engine("handlebars", engine({
  runtimeOptions: {
      allowProtoPropertiesByDefault: true,
      allowProtoMethodsByDefault: true,
 },
}))
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

initPassport()
app.use(passport.initialize())

app.use(cookieParser("CoderCoder123"))

app.use("/", vistasRouter)
app.use("/", testLogs)
app.use("/api/mock", mockingRouter);
app.use("/api/usuarios", usuariosRouter.getRouter())
app.use("/api/productos", productosRouter.getRouter())
app.use("/api/carritos", carritosRouter)
app.use("/api/sessions", sessionsRouter)
app.use("/", mailRouter)
app.use("/pruebas", pruebasRouter)

app.get('/usuario',(req,res)=>{
  let nombre=faker.person.firstName()
  let apellido=faker.person.lastName()
  let email=faker.internet.email({firstName:nombre, lastName:apellido})
  let edad=faker.number.int({min:18, max:70})
  let password=faker.internet.password({length:6, memorable:true})

  let usuario={nombre, apellido, email, edad, password}

  console.log(`Se generó el usuario ${nombre} ${apellido}, con email: ${email}`)
  res.setHeader('Content-Type','application/json');
  return res.status(200).json({usuario});
})

const server = app.listen(PORT, () => {
  //console.log(`Server escuchando en puerto ${PORT}`);
  logger.info(`Server escuchando en puerto ${PORT} - pid: ${process.pid} - worker n°: ${cluster.worker.id}`)
});

let mensajes=[]
let usuarios=[]

  io = new Server(server);

  let cManager=new ChatManager()
  io.on('connection', (socket) => {
    logger.info(`Cliente Conectado con el id ${socket.id}`)
    socket.emit('saludo', { emisor: 'server', mensaje: 'Bienvenido al server' });

    socket.on('confirmacion', nombre => {
  usuarios.push({id:socket.id, nombre})
  socket.emit("historial", mensajes)
      socket.broadcast.emit("nuevoUsuario", nombre)
    });
    socket.on("mensaje", (nombre, mensaje) => {
      cManager.guardarMensaje(nombre, mensaje)
      .then(mensajeGuardado => {
        logger.info('Mensaje guardado exitosamente:', mensajeGuardado )
      })
      .catch(error => {
        logger.info('Error al guardar el mensaje:', error)
      });
      io.emit("nuevoMensaje", nombre, mensaje)
    });
    
  socket.on("disconnect", ()=>{
    let usuario=usuarios.find(u=>u.id===socket.id)
    if(usuario){
        socket.broadcast.emit("saleUsuario", usuario.nombre)
    }
  })
  socket.on("connection", socket=>{
    logger.info(`Se conecto un cliente con id ${socket.id}`)
  });
  })
}