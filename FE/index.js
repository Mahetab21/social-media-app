let socket;
const log = value => { document.querySelector('#log').textContent += JSON.stringify(value) + '\n'; };
document.querySelector('#connect').addEventListener('submit', event => {
 event.preventDefault(); if(socket)socket.disconnect();
 const authorization=document.querySelector('#token').value.trim();
 socket=io({auth:{authorization},reconnection:false});
 socket.on('connect',()=>log({status:'connected'}));
 socket.on('connect_error',error=>log({error:error.message}));
 socket.on('disconnect',()=>log({status:'disconnected'}));
 for(const event of ['newMessage','successMessage','eventError'])socket.on(event,data=>log({event,...data}));
 document.querySelector('#token').value='';
});
document.querySelector('#message').addEventListener('submit',event=>{
 event.preventDefault();if(!socket?.connected)return log({error:'Connect first'});
 socket.emit('sendMessage',{sendTo:document.querySelector('#recipient').value.trim(),content:document.querySelector('#content').value},result=>log(result));
});
document.querySelector('#disconnect').addEventListener('click',()=>socket?.disconnect());
