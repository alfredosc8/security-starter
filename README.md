## Predix Security Starter Kit

### Prerequisites

- Node.js, used to run JavaScript tools from the command line, which includes a package manager called "npm".
- bower, a Node.js tool to install run-time dependencies.
- gulp, a Node.js-based build tool.

**To install dependencies:**

1)  Check your Node.js version.

```sh
node --version
```

The version should be at or above 0.10.x.

2)  If you don't have Node.js installed, or you have a lower version, go to [nodejs.org](https://nodejs.org) and click on the big green Install button.

3) In addition, you will need the Cloud Foundry CLI tool:
<https://github.com/cloudfoundry/cli/releases/tag/v6.12.2>
Then you'll need to login with your Predix credentials.

4) Run these commands in the root `security-starter` directory of this project.
```
npm install -g bower
npm install
bower install
```
(If you have trouble with the npm install, try `npm install --production` to install only the bare-bones dependencies to run the app, not include dev dependencies.)

### Getting Started

#### Running in Cloud Foundry
When running in the cloud, this application uses Redis as a session store.
You'll need to create a redis service named "security-starter-redis", using the `cf create-service` command.  (When the app is pushed to the cloud, it will bind to that service.)
Then run these commands to build & push to the cloud.
```
gulp
cf push <<unique-app-name>>
```

#### Finding your UAA URL
You need to run a few commands to create your instance of Predix UAA and find its URL.  
You'll push another simple node starter app, then bind it to your instance of UAA.  Don't forget your new admin secret!
```
cf create-service predix-uaa beta <<new-uaa-instance-name>> -c '{"adminClientSecret": "<<new-admin-secret>>"}'
git clone https://github.com/PredixDev/pdk-security-starter-nodejs.git
cd pdk-security-starter-nodejs
cf push <<new-sample-app-name>>
cf bind-service <<new-sample-app-name>> <<new-uaa-instance-name>>
cf env <<new-sample-app-name>>
```
Check the output of that last command, for the "predix-uaa" service, and copy the "uri" for that service, from the "credentials" object.

#### Running locally
Open up app/uaaConfig.json and enter the URL of the new UAA service instance.

__NOTE:__ When running locally, the app will only connect to a single instance of UAA, which is specified in the uaaConfig.json file.  Any value entered in to the "UAA URL" input field on the UI will be ignored.  This input field used only in the cloud.  The reason is that we use a different proxy locally, to work around the corporate proxy server.

Now you're ready to start running this application locally with these commands:
```
npm install --production
npm start
```
