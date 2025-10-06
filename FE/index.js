const clientIo= io("http://localhost:3000")
clientIo.on("connect",()=>{
    console.log("client connected");
})