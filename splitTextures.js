const { execSync } = require('child_process')
const fs = require('fs')


module.exports = {
    splitTextures: function(spawncode) {
        fs.mkdirSync(`./output/${spawncode}/stream/textures`, { recursive: true })
        execSync(`Utils\\Windows\\YTDToolio.exe unpack "./output/${spawncode}/stream/${spawncode}.ytd" -d "./output/${spawncode}/stream/textures"`)
        const allTextures = fs.readdirSync(`./output/${spawncode}/stream/textures`)
        let textureDetails = allTextures.map(texture => { return { texture, size: fs.statSync(`./output/${spawncode}/stream/textures/${texture}`).size } })
        
        textureDetails = textureDetails.sort((a, b) => b.size - a.size)
        
        let totalSize = textureDetails.reduce((prev, curr) => { return prev + curr.size }, 0)
        
        function getSize(input) {
            return input.reduce((prev, curr) => { return prev + curr.size }, 0)
        
        }
        
        if (totalSize > 16000000) {
            let finalOutput = []
            let toSort = textureDetails
            toSort.forEach(item => { 
                if(!finalOutput[0]) {
                    console.log('Forcing first item')
                    finalOutput.push([item])
                }
                else {
                    let space = false
                    finalOutput.forEach(output => {
                        if(!space && getSize(output) + item.size < 16000000) {
                            finalOutput[finalOutput.indexOf(output)].push(item)
                            space = true
                        }
                    })
                    if(!space) {
                        finalOutput.push([item])
                    }
                }
            })
            finalOutput.forEach(i => {
                fs.mkdirSync(`./output/${spawncode}/stream/textures/repack_${finalOutput.indexOf(i)}`)
                i.forEach(e => {
                    fs.renameSync(`./output/${spawncode}/stream/textures/${e.texture}`, `./output/${spawncode}/stream/textures/repack_${finalOutput.indexOf(i)}/${e.texture}`)
                })
            })
            fs.readdirSync(`./output/${spawncode}/stream/textures`).filter(f => f.startsWith('repack_')).forEach(f => {
                execSync(`Utils\\Windows\\YTDToolio.exe pack "./output/${spawncode}/stream/textures/${f}" -d "./output/${spawncode}/stream/${spawncode}_${f.split('repack_')[1]}.ytd"`)
            })    
            fs.rmSync(`./output/${spawncode}/stream/textures`, { recursive: true })
        }
        else {
            console.log('Not over 16mb')
            fs.rmSync(`./output/${spawncode}/stream/textures`, { recursive: true })
        }        
    }
}