require('./setup.cjs');
const {describe,test,before,beforeEach,after}=require('node:test'),assert=require('node:assert/strict');
if(!process.env.TEST_MONGO_URI){test('database/socket suite needs disposable TEST_MONGO_URI',{skip:true},()=>{});}else{
 if(!/\/social_test(?:[/?]|$)/.test(process.env.TEST_MONGO_URI))throw new Error('Refusing a non-test database');
 const mongoose=require('mongoose'),request=require('supertest'),{io}=require('socket.io-client'),{once}=require('node:events');
 const User=require('../dist/DB/model/user.model').default,Post=require('../dist/DB/model/post.model').default;
 const Otp=require('../dist/DB/model/otp.model').default,Friend=require('../dist/DB/model/friendRequest.model').default,Chat=require('../dist/DB/model/chat.model').default;
 const {Hash,Compare}=require('../dist/utils/hash'),{issueTokens}=require('../dist/utils/token'),{consumeOtp}=require('../dist/service/otp');
 const mail=require('../dist/service/sendEmail'),{createApp}=require('../dist/app.controller'),{initializationIo}=require('../dist/modules/gateway/gateway');
 let server,socketServer,api,url,messages=[],counter=0,sockets=[];
 mail.sendEmail=async options=>{messages.push(options);return {messageId:'test'}};
 const body={content:'Visible post content',availability:'public',allowComments:'allow'};
 async function account(extra={}){return User.create({fName:'Alice',lName:'Example',email:'user'+(++counter)+'@example.test',password:await Hash('Password1'),age:25,gender:'female',confirmed:true,...extra});}
 async function auth(u){const t=await issueTokens(u);return {header:(u.role==='user'?'Bearer ':'Admin ')+t.access_token,...t};}
 async function code(u,purpose,extra={}){return Otp.create({userId:u._id,purpose,email:u.email,hash:await Hash('123456'),sentAt:new Date(Date.now()-61000),expiresAt:new Date(Date.now()+600000),attempts:0,tokenVersion:u.tokenVersion||0,...extra});}
 async function friends(a,b){await User.updateOne({_id:a._id},{$addToSet:{friends:b._id}});await User.updateOne({_id:b._id},{$addToSet:{friends:a._id}});}
 async function connect(header){
  const s=io(url,{auth:{authorization:header},transports:['websocket'],reconnection:false});sockets.push(s);
  await Promise.race([once(s,'connect'),once(s,'connect_error').then(([e])=>{throw e})]);return s;
 }
 function emit(s,name,data){return new Promise((resolve,reject)=>s.timeout(3000).emit(name,data,(err,r)=>err?reject(err):resolve(r)));}
 describe('HTTP, database and Socket.IO regression coverage',{concurrency:false},()=>{
  before(async()=>{
   await mongoose.connect(process.env.TEST_MONGO_URI);await Promise.all(Object.values(mongoose.models).map(m=>m.syncIndexes()));
   server=createApp().listen(0,'127.0.0.1');await once(server,'listening');socketServer=initializationIo(server);
   url='http://127.0.0.1:'+server.address().port;api=request(server);
  });
  beforeEach(async()=>{for(const s of sockets)s.disconnect();sockets=[];await Promise.all(Object.values(mongoose.models).map(m=>m.deleteMany({})));messages=[];});
  after(async()=>{for(const s of sockets)s.disconnect();if(socketServer)await new Promise(r=>socketServer.close(r));if(server?.listening)await new Promise(r=>server.close(r));await mongoose.disconnect();});
  test('health/docs work and anonymous S3 routes are removed',async()=>{
   await api.get('/').expect(200);await api.get('/openapi.json').expect(200);
   for(const p of ['/upload/','/upload/delete/private-key','/upload/delete-folder/users','/upload/pre-signed-url/private-key'])await api.get(p).expect(404);
   await api.get('/users/getProfile').expect(401);
  });
  test('signup hashes credentials and email confirmation is single use',async()=>{
   const d={fName:'Alice',lName:'Example',email:'NEW@example.test',password:'Password1',cPassword:'Password1',age:25,gender:'female'};
   const r=await api.post('/users/signUp').send(d).expect(201);assert.equal(r.body.user.password,undefined);
   const u=await User.findOne({email:'new@example.test'});assert.ok(await Compare(d.password,u.password));assert.equal(u.role,'user');
   const otp=messages[0].html.match(/<p>([0-9]{6})<\/p>/)[1];
   await api.patch('/users/confirmEmail').send({email:u.email,otp}).expect(200);assert.equal(await Otp.countDocuments({userId:u._id}),0);
   await api.patch('/users/confirmEmail').send({email:u.email,otp}).expect(400);
  });
  test('both login routes reject frozen or unconfirmed accounts',async()=>{
   for(const fields of [{confirmed:false},{deletedAt:new Date()}]){const u=await account(fields);for(const route of ['signIn','logIn'])await api.post('/users/'+route).send({email:u.email,password:'Password1'}).expect(401);}
  });
  test('both login routes require the additional email code before issuing tokens',async()=>{
   const u=await account({twoFactorEnabled:true});
   for(const route of ['signIn','logIn']){
    await Otp.deleteMany({});const r=await api.post('/users/'+route).send({email:u.email,password:'Password1'}).expect(200);
    assert.equal(r.body.twoFactor,true);assert.equal(r.body.access_token,undefined);
   }
   const otp=messages.at(-1).html.match(/<p>([0-9]{6})<\/p>/)[1];
   const r=await api.post('/users/confirmTwoFactorLogin').send({email:u.email,otp}).expect(200);assert.ok(r.body.access_token);assert.equal(r.body.user.password,undefined);
   await api.post('/users/confirmTwoFactorLogin').send({email:u.email,otp}).expect(400);
  });
  test('OTP purpose, expiry, attempt cap, credential version and concurrent single use',async()=>{
   const u=await account();await code(u,'two-factor-setup');await assert.rejects(()=>consumeOtp(u._id,'two-factor-login','123456'));
   await code(u,'reset-password',{expiresAt:new Date(Date.now()-1000)});await assert.rejects(()=>consumeOtp(u._id,'reset-password','123456'));
   await Otp.deleteMany({});await code(u,'reset-password');for(let i=0;i<5;i++)await assert.rejects(()=>consumeOtp(u._id,'reset-password','000000'));
   await assert.rejects(()=>consumeOtp(u._id,'reset-password','123456'));
   await Otp.deleteMany({});await code(u,'reset-password');const results=await Promise.allSettled([consumeOtp(u._id,'reset-password','123456'),consumeOtp(u._id,'reset-password','123456')]);
   assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
   await code(u,'two-factor-login');await User.updateOne({_id:u._id},{$inc:{tokenVersion:1}});
   await assert.rejects(()=>consumeOtp(u._id,'two-factor-login','123456'));
  });
  test('password reset invalidates existing access and refresh tokens',async()=>{
   const u=await account(),t=await auth(u);await code(u,'reset-password');
   await api.patch('/users/resetPassword').send({email:u.email,otp:'123456',password:'ChangedPass2',cPassword:'ChangedPass2'}).expect(200);
   assert.ok(await Compare('ChangedPass2',(await User.findById(u._id)).password));
   await api.get('/users/getProfile').set('Authorization',t.header).expect(401);
   await api.get('/users/refreshToken').set('Authorization','Bearer '+t.refresh_token).expect(401);
  });
  test('refresh rotation rejects replay and logout revokes paired refresh token',async()=>{
   const u=await account(),t=await auth(u),r=await api.get('/users/refreshToken').set('Authorization','Bearer '+t.refresh_token).expect(200);
   await api.get('/users/refreshToken').set('Authorization','Bearer '+t.refresh_token).expect(401);
   await api.post('/users/logOut').set('Authorization','Bearer '+r.body.access_token).send({flag:'current'}).expect(200);
   await api.get('/users/refreshToken').set('Authorization','Bearer '+r.body.refresh_token).expect(401);
  });
  test('users cannot change roles or freeze others; self-freeze revokes access',async()=>{
   const a=await account(),b=await account(),t=await auth(a);
   await api.patch('/users/chandeRole/'+b.id).set('Authorization',t.header).send({role:'admin'}).expect(403);
   await api.patch('/users/freezeAccount/'+b.id).set('Authorization',t.header).expect(403);
   await api.patch('/users/freezeAccount').set('Authorization',t.header).expect(200);
   await api.get('/users/getProfile').set('Authorization',t.header).expect(401);
  });
  test('REST and GraphQL share private/friends post visibility',async()=>{
   const a=await account(),b=await account(),at=await auth(a),bt=await auth(b);
   const hidden=await Post.create({...body,createdBy:a._id,availability:'private'}),restricted=await Post.create({...body,createdBy:a._id,availability:'friends'});
   await api.get('/posts/getPostById/'+hidden.id).set('Authorization',bt.header).expect(404);
   await api.get('/posts/getPostById/'+hidden.id).set('Authorization',at.header).expect(200);
   let r=await api.get('/posts/getPost').set('Authorization',bt.header).expect(200);assert.equal(r.body.posts.length,0);
   r=await api.post('/graphql').set('Authorization',bt.header).send({query:'{getPosts(page:1,limit:10){countDocument posts{content}}}'}).expect(200);
   assert.equal(r.body.data.getPosts.countDocument,0);
   await friends(a,b);r=await api.get('/posts/getPost').set('Authorization',bt.header).expect(200);assert.equal(r.body.posts.length,1);assert.equal(r.body.posts[0]._id,restricted.id);
  });
  test('GraphQL user reads require admin and honor the requested id',async()=>{
   const a=await account(),b=await account(),admin=await account({role:'admin'}),at=await auth(a),ad=await auth(admin);
   let r=await api.post('/graphql').set('Authorization',at.header).send({query:'{getAllUser{_id email}}'});assert.ok(r.body.errors);
   r=await api.post('/graphql').set('Authorization',ad.header).send({query:'{getOneUser(id:"'+b.id+'"){_id email}}'});assert.equal(r.body.data.getOneUser._id,b.id);
   r=await api.post('/graphql').set('Authorization',ad.header).send({query:'{getAllUser{password}}'});assert.ok(r.body.errors);
  });
  test('post freeze requires ownership, frozen posts disappear and paging is bounded',async()=>{
   const a=await account(),b=await account(),at=await auth(a),bt=await auth(b),p=await Post.create({...body,createdBy:a._id});
   await api.patch('/posts/freeze/'+p.id).set('Authorization',bt.header).expect(404);
   const r=await api.patch('/posts/'+p.id).set('Authorization',at.header).expect(200);assert.equal(r.body.post.likes.length,1);
   await api.get('/posts/getPost?limit=999').set('Authorization',at.header).expect(400);
   await api.patch('/posts/freeze/'+p.id).set('Authorization',at.header).expect(200);
   await api.get('/posts/getPostById/'+p.id).set('Authorization',bt.header).expect(404);
  });
  test('nested replies retain root post, enforce ownership and cannot cross posts',async()=>{
   const a=await account(),b=await account(),at=await auth(a),bt=await auth(b),p=await Post.create({...body,createdBy:a._id}),q=await Post.create({...body,createdBy:a._id}),base='/posts/'+p.id+'/comments';
   let r=await api.post(base).set('Authorization',at.header).send({content:'Top comment',onModel:'post'}).expect(201);const c=r.body.comment;
   r=await api.post(base+'/'+c._id).set('Authorization',at.header).send({content:'Reply comment',onModel:'Comment'}).expect(201);const reply=r.body.comment;assert.equal(reply.postId,p.id);
   await api.post(base+'/'+reply._id).set('Authorization',at.header).send({content:'Nested reply',onModel:'Comment'}).expect(201);
   r=await api.get(base+'/'+c._id).set('Authorization',at.header).expect(200);assert.equal(r.body.comment.replies.length,1);
   await api.get('/posts/'+q.id+'/comments/'+c._id).set('Authorization',at.header).expect(404);
   await api.patch(base+'/freeze/'+c._id).set('Authorization',bt.header).expect(404);
   await api.patch(base+'/freeze/'+c._id).set('Authorization',at.header).expect(200);
   await api.get(base+'/'+reply._id).set('Authorization',at.header).expect(404);
  });
  test('outsiders cannot read private comments',async()=>{
   const a=await account(),b=await account(),at=await auth(a),bt=await auth(b),p=await Post.create({...body,createdBy:a._id,availability:'private'}),base='/posts/'+p.id+'/comments';
   const r=await api.post(base).set('Authorization',at.header).send({content:'Private comment',onModel:'post'}).expect(201);
   await api.get(base+'/'+r.body.comment._id).set('Authorization',bt.header).expect(404);await api.get(base).set('Authorization',bt.header).expect(404);
  });
  test('friend requests reject duplicates, update both sides and enforce blocks',async()=>{
   const a=await account(),b=await account(),at=await auth(a),bt=await auth(b);
   const results=await Promise.all([api.post('/users/friendRequest/'+b.id).set('Authorization',at.header),api.post('/users/friendRequest/'+b.id).set('Authorization',at.header)]);
   assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);const f=await Friend.findOne({});
   await api.patch('/users/acceptRequest/'+f.id).set('Authorization',bt.header).expect(200);
   assert.ok((await User.findById(a._id)).friends.some(x=>String(x)===b.id));assert.ok((await User.findById(b._id)).friends.some(x=>String(x)===a.id));
   await api.patch('/users/acceptRequest/'+f.id).set('Authorization',bt.header).expect(404);
   await api.patch('/users/blockUser/'+b.id).set('Authorization',at.header).expect(200);
   assert.equal((await User.findById(a._id)).friends.length,0);assert.equal((await User.findById(b._id)).friends.length,0);
   await api.post('/users/friendRequest/'+a.id).set('Authorization',bt.header).expect(404);
   const p=await Post.create({...body,createdBy:b._id});await api.get('/posts/getPostById/'+p.id).set('Authorization',at.header).expect(404);
  });
  test('group creator is a participant and nonmembers cannot access messages',async()=>{
   const a=await account(),b=await account(),c=await account();await friends(a,b);const at=await auth(a),ct=await auth(c);
   const r=await api.post('/chat/group').set('Authorization',at.header).send({group:'Study group',participants:[b.id]}).expect(201);
   assert.ok(r.body.chat.participants.includes(a.id));assert.ok(r.body.chat.participants.includes(b.id));
   await api.get('/chat/group/'+r.body.chat._id).set('Authorization',at.header).expect(200);
   await api.get('/chat/group/'+r.body.chat._id).set('Authorization',ct.header).expect(404);
  });
  test('socket messages validate, acknowledge, conceal secrets and recheck session/block state',async()=>{
   const a=await account(),b=await account();await friends(a,b);const at=await auth(a),bt=await auth(b),sender=await connect(at.header),receiver=await connect(bt.header);
   const incoming=once(receiver,'newMessage'),r=await emit(sender,'sendMessage',{sendTo:b.id,content:'Hello friend'});assert.equal(r.ok,true);
   const [payload]=await incoming;assert.equal(payload.content,'Hello friend');assert.equal(payload.from.password,undefined);assert.equal(payload.from.email,undefined);
   assert.equal((await emit(sender,'sendMessage',{sendTo:'bad',content:''})).ok,false);
   await api.patch('/users/blockUser/'+a.id).set('Authorization',bt.header).expect(200);
   assert.equal((await emit(sender,'sendMessage',{sendTo:b.id,content:'Blocked message'})).ok,false);
   await api.post('/users/logOut').set('Authorization',at.header).send({flag:'all'}).expect(200);
   assert.equal((await emit(sender,'sayHi',{})).ok,false);
  });
  test('chat pagination counts messages and does not repeat an exhausted page',async()=>{
   const a=await account(),b=await account();await friends(a,b);
   await Chat.create({createdBy:a._id,participants:[a._id,b._id],pairKey:[a.id,b.id].sort().join(':'),message:Array.from({length:7},(_,i)=>({content:'Message '+i,createdBy:a._id}))});
   const at=await auth(a),base='/users/'+b.id+'/chat';
   let r=await api.get(base+'?page=2&limit=5').set('Authorization',at.header).expect(200);assert.equal(r.body.pagination.totalMessages,7);assert.equal(r.body.chat.message.length,2);
   r=await api.get(base+'?page=3&limit=5').set('Authorization',at.header).expect(200);assert.equal(r.body.chat.message.length,0);
  });
 });
}
