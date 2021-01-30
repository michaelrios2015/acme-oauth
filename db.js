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

User.byToken = async(token)=> {
  try {
    const { id } = await jwt.verify(token, process.env.JWT);
    // const user = await User.findByPk(id);
    const user = await User.findByPk(id, {include: UserLogin });

    // console.log(user1.data)
    if(user){
        // userLogin here??

      return user;
    }
    throw 'noooo';
  }
  catch(ex){
    // console.log('--------------ex--------------------')
    //   console.log(ex)
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
};

// documentation - https://docs.github.com/en/developers/apps/authorizing-oauth-apps

// useful urls
const GITHUB_CODE_FOR_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_ACCESS_TOKEN_FOR_USER_URL = 'https://api.github.com/user';

//the authenticate methods is passed a code which has been sent by github
//if successful it will return a token which identifies a user in this app
User.authenticate = async(code)=> {
    // console.log('---------------code--------------------');
    // console.log(code);

    try{
        // console.log("-------User.authenicate-----------------");
        // console.log(process.env.client_id);
        //I assume this comes first and we post a request to github
        // console.log(process.env.client_secret);
        let response = await axios.post('https://github.com/login/oauth/access_token', {
            //essentially magic
           
            code: code,
            client_id: process.env.client_id,
            client_secret: process.env.client_secret
        }, {
            headers:{
                accept: 'application/json'
            }
        })
        //we get a response
        // console.log("------------response-----------------");
        // console.log(response.data);
        const data = response.data;
        //something went wrong with the response
        if(data.error){
            const error = Error(data.error);
            error.status = 401;
            throw error
        }
        //we get the response again?? not sure
        response = await axios.get('https://api.github.com/user', {
            headers: {
                authorization: `token ${ data.access_token }`
            }
        })
        //at this point we have gotten a user from github
        const { login, ...github } = response.data;
        //we already have the so we find them
        let user = await User.findOne({
            where: {
                username: login
            }
        })
        //we don't have the user so we make the user
        if(!user){
            user = await User.create({ username: login, github });
            userlogin = await UserLogin.create({ userId: user.id });

        }
        else {
            //picks up github update??
            await user.update({ github });
            userlogin = await UserLogin.create({ userId: user.id });
        }

        //I think this is everything from the last lecture using a token instead of 
        //an id so only the login patron can get the info or something
        const jwToken = jwt.sign({ id: user.id }, process.env.JWT);
        // console.log(jwToken);
        return jwToken;
    } 
    catch(ex){
        console.log(process.env.client_id);
        next(ex)
    } 
  
    // throw 'nooooo';
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