## Predix Security Starter Kit

### Prerequisites

- Node.js, used to run JavaScript tools from the command line.
- npm, the node package manager, installed with Node.js and used to install Node.js packages.
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

### Getting Started
First you need to run a few commands to create your instance of Predix UAA and find its URL.  Don't forget your new admin secret!
```
cf create-service predix-uaa beta <<new-uaa-instance-name>> -c '{"adminClientSecret": "<<new-admin-secret>>"}'
git clone https://github.com/PredixDev/pdk-security-starter-nodejs.git
cd pdk-security-starter-nodejs
cf push <<new-sample-app-name>>
cf bind-service <<new-sample-app-name>> <<new-uaa-instance-name>>
cf env <<new-sample-app-name>>
```
Check the output of that last command, for the "predix-uaa" service, and copy the "uri" for that service, from the "credentials" object.
Open up app/uaaConfig.json and enter the URL of the new UAA service instance.

Now you're ready to start running this application locally with these commands:
```
npm install --production
npm start
```

### Developers
If you want to contribute to this security-starter application, there are a few extra setup steps.  (The setup above has been simplified to ease installation for customers.)
We're also committing the "dist" directory to Github, just to make it easier for customers to run the app.

1) If you don't have bower installed globally, you'll need that:
```
npm install -g bower
```

2) Install dev dependencies:
```
npm install
bower install
```

3) Run using the "full" gulpfile:
```
gulp serve --gulpfile dev-gulpfile.js
```

4) Run the default "dist" task, so we can check the "dist" directory into Github.
```
gulp --gulpfile dev-gulpfile.js
```
