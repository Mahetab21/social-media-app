
const clientIo= io("http://localhost:3000",{
    auth:{
        authorization:"Bearer token"
    }
})
clientIo.on("connect",()=>{
    console.log("client connected");
})

clientIo.on("connect_error",(error)=>{
    console.log({error:error.message});
})
clientIo.on("userDisconnect",(data)=>{
    console.log("userDisconnect",data);
})