require('./setup.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),{Types}=require('mongoose');
const {Validation,ValidationGQL}=require('../dist/middleware/validation'),V=require('../dist/modules/users/user.validation');
const {likePostSchema}=require('../dist/modules/post/post.validation'),{schemaGQL}=require('../dist/modules/graphQl/schema.gql');
const {validateEnvironment}=require('../dist/config/environment'),{pagination}=require('../dist/utils/pagination'),{VerifyToken}=require('../dist/utils/token');
const User=require('../dist/DB/model/user.model').default;
test('compiled app initializes with Swagger configuration',()=>assert.equal(typeof require('../dist/app.controller').createApp(),'function'));
test('parsed defaults work with an Express query getter',()=>{
 const req={params:{postId:new Types.ObjectId().toString()}};Object.defineProperty(req,'query',{get:()=>({}),configurable:true});
 let next=false;Validation(likePostSchema)(req,{},()=>next=true);assert.equal(req.query.action,'like');assert.equal(next,true);
});
test('invalid request becomes 400 rather than JSON.parse failure',()=>assert.throws(()=>Validation(V.signInSchema)({body:{email:'bad',password:'x'}},{},()=>{}),e=>e.statusCode===400));
test('signup rejects roles and mismatched passwords',()=>{
 const d={fName:'Alice',lName:'Test',email:'a@example.test',password:'Password1',cPassword:'Password1',age:25,gender:'female'};
 assert.equal(V.signUpSchema.body.safeParse({...d,role:'admin'}).success,false);assert.equal(V.signUpSchema.body.safeParse({...d,cPassword:'wrong'}).success,false);assert.equal(V.signUpSchema.body.safeParse(d).success,true);
});
test('email normalization and empty profile checks',()=>{
 assert.equal(V.signInSchema.body.parse({email:'A@EXAMPLE.TEST',password:'x'}).email,'a@example.test');assert.equal(V.updateBasicInfoSchema.body.safeParse({}).success,false);
});
test('pagination rejects negative/fractional/oversized requests',()=>{
 for(const q of [{page:-1},{page:1.5},{limit:0},{limit:51}])assert.throws(()=>pagination(q),e=>e.statusCode===400);
 assert.deepEqual(pagination({page:'2',limit:'5'}),{page:2,limit:5,skip:5});
});
test('GraphQL validates arguments and cannot select password',async()=>{
 await assert.rejects(()=>ValidationGQL(V.getOneUserSchemaType,{id:'bad'}));assert.equal(schemaGQL.getType('User').getFields().password,undefined);
 assert.ok(schemaGQL.getQueryType().getFields().getOneUser.args.some(a=>a.name==='id'));
});
test('user serialization hides password and pending authentication state',()=>{
 const json=new User({fName:'Alice',lName:'Test',email:'a@example.test',password:'secret',tokenVersion:3,tempProfileImage:'pending'}).toJSON();
 for(const k of ['password','tokenVersion','tempProfileImage'])assert.equal(json[k],undefined);assert.equal(json.userName,'Alice Test');
});
test('malformed JWT returns 401',async()=>assert.rejects(()=>VerifyToken({token:'bad',signature:process.env.ACCESS_TOKEN_USER}),e=>e.statusCode===401));
test('environment rejects reused secrets',()=>{
 const old=process.env.ACCESS_TOKEN_ADMIN;process.env.ACCESS_TOKEN_ADMIN=process.env.ACCESS_TOKEN_USER;
 assert.throws(validateEnvironment,/different/);process.env.ACCESS_TOKEN_ADMIN=old;assert.doesNotThrow(validateEnvironment);
});
