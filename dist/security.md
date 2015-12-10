## Predix UAA Security

### Expected Outcome
Use the [Predix Security Starter Kit](https://github.com/PredixDev/security-starter) along with this tutorial to quickly secure your Predix application.

### Prerequisites
* Predix Beta access
* Node
* Git

### Tutorial Steps

#### Create UAA service instance
`cf create-service predix-uaa`

Remember your admin secret!
#### Bind an app to UAA service
```
git clone some-project
cd some-project
cf push
cf bind-service ...
```
#### Find URL for your UAA service
`cf env some-project`
#### Download & Configure Security Starter Kit
`git clone https://github.com/PredixDev/security-starter.git`

Open security-starter/dist/uaaConfig.json and enter the UAA URL.
#### Run Security Starter Kit
```
npm install -g bower gulp
gulp serve
```
#### Login as Admin
Enter the admin secret you created earlier, when you ran this command: `cf create-service predix-uaa`.

After logging in, you'll get an Admin Token, which will be used to configure your instance of UAA.

#### Create Client ID
A Client ID is used by an Application to make client/server requests to Services in the cloud.  Apps usually only need a single Client ID.  *Do not share your Client ID with your users.*
Enter the name of the new client id for your application, e.g. "my-app-clientid".
In this utility, we do see the Client ID in the browser, but this is not recommended in a production application.  Client ID should be kept on the server.

#### Create User
Users of your application will enter this username and password to access your application.  Later we can add this user to groups, which can be used to give access to Predix services.

#### Login as User
This is a demonstration of logging as your new user, with the grant type of "password".  In production, you should probably use grant type "authorization_code".  Also, the client ID and secret should only be stored on the server, not displayed in the browser.

#### Check Token
The token is a JSON Web Token (JWT), which is an industry standard.  Learn more about JWT at <a href="http://jwt.io" target="_blank">jwt.io.</a>  The check_token REST API can be used by your front end UI Application, or back end microservice to ensure that the user has a valid token.

#### Create Group
Groups can be used to manage access to resources.  In Predix UAA, group names can be created with names that match scopes.  The scopes match Predix-Zone-Ids to manage access to Predix platform services.  After creating a Predix service such as Timeseries or Asset, you'll want to create a group to match.

#### Add to Group
Different users might have access to different services.  By adding users to groups, you can manage this access at a high level.
