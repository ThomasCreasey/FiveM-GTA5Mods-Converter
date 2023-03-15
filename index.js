const fs = require('fs')
const puppeteer = require('puppeteer')
const { get } = require('axios')
const { zip, unzip } = require('cross-unzip')
const { execSync } = require('child_process')
const glob = require('glob')
const config = require('./config')
const { splitTextures } = require('./splitTextures')
const prompt = require('prompt-sync')()

function patchFile(file) {
    const contents = fs.readFileSync(file)
    contents[3] = 0x37 // Patch 4th byte of the file to 37 because it is broken
    fs.writeFileSync(file, contents)
}

async function unpack(self, spawncode) {
    return new Promise((resolve, reject) => {
        self.updateStatus(spawncode, 'Unpacking archive')
        fs.mkdirSync(`./output/${spawncode}/stream`, { recursive: true })
        fs.mkdirSync(`./output/${spawncode}/data`, { recursive: true })
        let ogSpawncode;

        const foundRpf = glob.sync(`./cache/${spawncode}/**/*.rpf`)

        if(foundRpf[0]) {
            self.updateStatus(spawncode, 'Extracting RPFs')
            foundRpf.forEach(rpf => {
                if(config.os === 'Windows') {
                    execSync(`Utils\\GTAUtil.exe extractarchive -i "${rpf}" -o ./cache/${spawncode}/extractedRPF`)
                }
                else if(config.os === 'Linux') {
                    execSync(`./Utils/GTAUtil.exe extractarchive -i "${rpf}" -o ./cache/${spawncode}/extractedRPF`)
                }
                const foundMetaFiles = glob.sync(`./cache/${spawncode}/extractedRPF/**/*.meta`)
                const vehicleMeta = foundMetaFiles.filter(file => file.includes('vehicles.meta'))[0]
                if(vehicleMeta) {
                    const contents = fs.readFileSync(vehicleMeta).toString()
                    ogSpawncode = contents.split('<modelName>')[1].split('</modelName>')[0]
                    if(!ogSpawncode) return resolve({ error: true, message: 'No spawncode found in vehicle meta file' })
                    foundMetaFiles.forEach(file => {
                        let contents = fs.readFileSync(file).toString()
                        contents = contents.replaceAll(ogSpawncode, spawncode)
                        contents = contents.replaceAll(ogSpawncode.toUpperCase(), spawncode)
                        contents = contents.replaceAll(ogSpawncode.toLowerCase(), spawncode)
                        fs.writeFileSync(file, contents)
                        fs.copyFileSync(file, `./output/${spawncode}/data/${file.split('/').pop()}`)
                    })
                }
                const foundVehFiles = glob.sync(`./cache/${spawncode}/extractedRPF/**/*(*.yft|*.ytd)`)
                foundVehFiles.forEach(file => {
                    if(!ogSpawncode) {
                        let fullCode = file.split('/').pop()
                        fullCode = fullCode.split('.y')[0]
                        fullCode = fullCode.replace('_hi', '')
                        fullCode = fullCode.replace('+hi', '')
                        ogSpawncode = fullCode
                    }
                    if(!ogSpawncode) return resolve({ error: true, message: 'Unable to find the original spawncode' })
                    patchFile(file)
                    fs.copyFileSync(file, `./output/${spawncode}/stream/${(file.split('/').pop()).replace(ogSpawncode.toLowerCase(), spawncode)}`)
                })

                splitTextures(spawncode)
                fs.copyFileSync(`./Utils/fxmanifest.lua`, `./output/${spawncode}/fxmanifest.lua`)
                zip(`./output/${spawncode}`, `./output/${spawncode}.zip`, err => {
                    clearFiles(spawncode)
                    resolve({ error: false, location: `./output/${spawncode}.zip`})
                })

            })
        }
        else {
            return resolve({ error: true, message: 'No RPF found' })
        }
    })
}

function clearFiles(spawncode) {
    fs.rmSync(`./cache/${spawncode}`, { recursive: true })
    fs.rmSync(`./output/${spawncode}`, { recursive: true })
}
const Queue = require('better-queue')

const q = new Queue(async function(task, cb) {
    const self = this
    let downloadLink
    const { url } = task
    const spawncode = task.id
    self.updateStatus(spawncode, 'Initialising...')
    if(!url.includes('https://files.gta5-mods.com')) {
        try {
            self.updateStatus(spawncode, 'Fetching download link' )
            const browser = await puppeteer.launch()
            const page = await browser.newPage()
            await page.goto(url)
            await page.$eval('.btn-download', el => el.click());
            await page.waitForSelector('.btn-download')
            const content = await page.content()
            downloadLink = content.split('\n').filter(line => line.includes('btn-download') && line.includes('https://files.gta5-mods.com'))[0].split('href="')[1].split('"><span')[0]
            await browser.close() 
        }
        catch(err) {
            console.log(err)
            return cb({ error: true, message: 'Unable to fetch download link' })
        }
    }
    else {
        downloadLink = url
    }
    self.updateStatus(spawncode, 'Downloading file')
    const file = await get(downloadLink, {
        responseType: 'arraybuffer'
    })
    self.updateStatus(spawncode, 'File Downloading')
    fs.writeFileSync(`./cache/${spawncode}.rar`, file.data)
    self.updateStatus(spawncode, 'Extracting file')
    unzip(`./cache/${spawncode}.rar`, `./cache/${spawncode}`, async err => {
        fs.rmSync(`./cache/${spawncode}.rar`)
        if(err) return console.log(err);
        const foundYft = glob.sync(`./cache/${spawncode}/**/*.yft`)
        if(foundYft[0]) {
            const foundYtd = glob.sync(`./cache/${spawncode}/**/*.ytd`)
            if(foundYtd[0]) {
                await unpack(self, spawncode)
                cb()
            }
        }
        else {
            await unpack(self, spawncode)
            cb()
        }
    })
}, { concurrent: 5 })


const url = prompt('Enter the link to the mod from GTA5-Mods.com: ')
const spawncode = prompt('Enter the spawncode you want to use: ')

q.push({ url, id: spawncode })
    .on('finish', function() {
        console.log('Finished')
    })
    .on('statusUpdate', function(msg) {
        console.log(msg)
    })

    
