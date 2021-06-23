const {Docker} = require('node-docker-api');

function runContainer(imageName, containerName, cmd, binds, environmentVars)
{
    const docker = new Docker();
    
    docker.container.create
    (
        {
            Image: imageName,
            Cmd: cmd,
            name: containerName,
            HostConfig:  
            { 
                Binds: binds
            },
            Env:environmentVars    
        }
    ) 
    .then(container => container.start())
    .then(container => attachLogsToContainer(container))
    .catch(error =>  dialog.showMessageBoxSync(null, {
        type: "error",
        title: "Run docker",
        message: error.message,
      }));
}

async function stopDockerContainer(containerName)
{
    handleEngineLog('Stopping docker container...',0)
    let container = await getDockerContainer(containerName);
    //container = await container.stop();
    container = await container.delete({ force: true });
    handleEngineLog('Container stopped...',0)
}

async function getDockerContainer(containerName)
{
    const docker = new Docker();
    
    let containers = await docker.container.list({'all':'1'});
    
    return containers.find(
        x => x.data.Names[0] === '/' + containerName );
}

async function stopAndRunContainer(imageName, containerName, cmd, binds, environmentVars)
{
    let container = await getDockerContainer(containerName);
    
    if (container == null)
    {
        runContainer(imageName, containerName, cmd, binds, environmentVars);
    }
    else
    {
        let status = await container.status();
        let currentContainer;

        if (status.data.State.Running)
        {
            currentContainer = await container.restart();
        }
        else
        {
            currentContainer = await container.start();  
        }
        attachLogsToContainer(currentContainer);
    }
}

async function exportDockerArchive(containerName, path, archiveName)
{
    let container = await getDockerContainer(containerName);
    
    container.fs.get({ path: path })
    .then(stream => {
        const file = fs.createWriteStream(archiveName);
        stream.pipe(file);
    });
}

function attachLogsToContainer(container)
{
    container.logs
    (
        {
            follow: true,
            stdout: true,
            stderr: true
        }
    )
    .then
    (
        stream => 
        {
            stream.on('data', info => handleEngineLog(info.toString(),0))
            stream.on('error', err => handleEngineLog(err.toString(),1))
        }
    )
    .catch(error => console.log(error))
}