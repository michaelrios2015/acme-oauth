const axios = require('axios');
const jwt = require('jsonwebtoken');
const Sequelize = require('sequelize');
const { STRING, INTEGER } = Sequelize;
const config = {
  logging: false
};

if(process.env.LOGGING){
  delete config.logging;
}
const conn = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:JerryPine@localhost/acme_db', config);

const User = conn.define('user', {
  username: STRING,
  githubId: INTEGER
});

const UserLogin = conn.define('userlogin', {
  });

UserLogin.belongsTo(User);
User.hasMany(UserLogin);  

//just sending in a token and returning a user so this should be the same as last week??
//except now the token is the the client_id?? 
User.byToken = async(token)=> {
  try {
    const { id } = await jwt.verify(token, process.env.JWT);
    const user = await User.findByPk(id, {include: UserLogin });

    if(user){
        // userLogin here??

      return user;
    }
    throw 'noooo';
  }
  catch(ex){
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
};

// documentation - https://docs.github.com/en/developers/apps/authorizing-oauth-apps

// useful urls
const GITHUB_CODE_FOR_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_ACCESS_TOKEN_FOR_USER_URL = 'https://api.github.com/user';

//exhange a passed in code for an access_token or throw error
const codeForGithubToken = async(code)=> {
  const response = await axios.post(GITHUB_CODE_FOR_TOKEN_URL,
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code
    },
    {
      headers: {
        accept: 'application/json'
      }
    }
  );
  const { access_token, error } = response.data;
  if(error){
    const _error = Error(error);
    _error.status = 401;
    throw _error;
  }
  return access_token;
};

//exchange access_token for github user
const accessTokenForGithubUser = async(access_token)=> {
  response = await axios.get(GITHUB_ACCESS_TOKEN_FOR_USER_URL, {
    headers: {
      authorization: `token ${ access_token }`
    }
  });
  return response.data;
};

//getUser from githubUser
const getUserFromGithubUser = async({ login, id, ...other})=> {
  let user = await User.findOne({
    where: {
      username: login,
      githubId: id
    }
  });
  if(!user){
    user = await User.create({ username: login, githubId: id });
    userlogin = await UserLogin.create({ userId: user.id });

  }
  else {
    //picks up github update??
    //await user.update({ github });
    userlogin = await UserLogin.create({ userId: user.id });
  }
  return user;
};

//the authenticate methods is passed a code which has been sent by github
//if successful it will return a token which identifies a user in this app
User.authenticate = async(code)=> {
  
  //we get the magic token from github
  const access_token = await codeForGithubToken(code);
  //we use magic acces token to get user info from github
  const githubUser = await accessTokenForGithubUser(access_token);
  //we put user in our database or update user
  const user = await getUserFromGithubUser(githubUser);
  //turn user into JWT token so only login user can see data
  const jwToken = jwt.sign({ id: user.id }, process.env.JWT);
  
  return jwToken;
 
};

const syncAndSeed = async()=> {
  await conn.sync({ force: true });
};

module.exports = {
  syncAndSeed,
  models: {
    User,
    UserLogin
  }
};