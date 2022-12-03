const http = require("http")
const express = require("express")
const app = express()
const server = http.createServer(app)
const {Server} = require("socket.io")
const PORT = process.env.PORT || 3000


app.use(express.json())
app.use(express.urlencoded({extended: false}))
let uzers = []
let lootz = []
let monz = []
let seedz = []
let orez = [{ meshId: '145', spawntype: "ore", place: "swampforest", pos: "10,-30", hits: 3}]
// const {swampTreez} = require("./swampforest")
let treez = [{ meshId: '4w2', spawntype: "trees", place: "swampforest", pos: "-50,2", hits: 2}]

app.get("/", (req, res) => {
    res.send(uzers).status(200)
})

const io = new Server(server, {
    cors: {
        origin:['http://localhost:8080', 'https://dungeonborn.vercel.app']
    }
})
const log = console.log

io.on("connection", socket => {
    
    socket.on("join", data => {

        const isUser = uzers.some(user => user._id === data._id)
        if(isUser) return log("user already in")
        uzers.push({...data, socketId: socket.id})
        log(uzers.length)

        io.emit("userJoined", {uzers,orez,treez, seedz, monz}) //monz is the AI monsters
        uzers.forEach(uzzer => log(uzzer.name))
    })
    socket.on("stop", detal => {
        const theUser = uzers.find(user => user._id === detal._id)
        if(!theUser) return
  
        io.emit("aUzerStopped", detal)
        
        uzers = uzers.map(user => user._id === detal._id ? {...user, _minning: false, _training: false, dirTarg: { x:detal.dirTarg.x ,z:detal.dirTarg.z}, x: detal.mypos.x, z: detal.mypos.z} : user)
    })
    socket.on("move", detal => {
        io.emit("aMechMove", detal)
    })
    socket.on("changeMode", detal => {
        const exist = uzers.find(user=>user._id === detal._id)
        if(!exist) return log("cannot find uzer")

        io.emit("changedMode", detal)

        uzers = uzers.map(user => user._id === detal._id ? {...user, mode: detal.mode } : user)
    })
    // ACTIONS FIRING !
    socket.on("attack", data => {
        const exist = uzers.find(user=>user._id === data._id)
        if(!exist) return log("cannot find uzer")
    
        io.emit('userAttack', data)
        uzers = uzers.map(user => user._id === data._id ? {...user, mode: data.mode } : user)
    })
    socket.on("stop_isAttack", data => {
        io.emit('stop_isAttackingFalse', data)
    })
    socket.on("userMine", data => {
        io.emit("userIsMinning", data)
        uzers = uzers.map(user => user._id === data._id ? {...user, x: data.pos.x, z: data.pos.z, dirTarg: data.dirTarg, _minning: true } : user)
    })
    socket.on("userTrain", data => {
        io.emit("userIsTraining", data)
        uzers = uzers.map(user => user._id === data._id ? {...user, x: data.pos.x, z: data.pos.z, dirTarg: data.dirTarg, _training: true } : user)
    })
    socket.on("userBump", data => {
        io.emit("aUserBumped", data)
        uzers = uzers.map(user => user._id === data._id ? {...user, x: data.pos.x, z: data.pos.z, dirTarg: data.dirTarg, _training: false, _minning: false, mode: 'stand' } : user)
    })
    
    // FROM ADMIN EMITS
    socket.on("ore", data => {
        orez.push(data)
        io.emit("receiveOre", data)
    })
    socket.on("trees", data => {
        treez.push(data)
        io.emit("receiveWood", data)
    })
    socket.on("sword", data => {
        lootz.push(data)
        io.emit("dropsword", data)
    })

    // ABOUT RECOURCES
    socket.on("oreDeductHits", data => {
        io.emit("oreDeducted", data)

        orez = orez.map(oree => oree.meshId === data.meshId ? {...oree, hits: oree.hits-1} : oree)

        const theOre = orez.find(oree => oree.meshId === data.meshId)
        if(theOre && theOre.hits <= 0){
            orez = orez.filter(oree => oree.meshId !== data.meshId)
            log(orez)
        }
    })
    socket.on("treeDeductHits", data => {
        io.emit("treeDeducted", data)

        treez = treez.map(puno => puno.meshId === data.meshId ? {...puno, hits: puno.hits-1} : puno)

        const theTree = treez.find(puno => puno.meshId === data.meshId)
        if(theTree && theTree.hits <= 0){
            treez = treez.filter(puno => puno.meshId !== data.meshId)
        }
    })
    socket.on("plantSeed", data => {
        const {meshId, spawntype, place,pos,hits} = data
        const toPush = { meshId, spawntype, place,pos,hits}
        seedz.push(toPush)
        io.emit("userWillPlant", data)
    })
    // spawncheats by admin
    socket.on("sft", data => {
        //isang besses lang dapat irun to 
        // kada simula ng server
        // pag isipan mabuti
        data.forEach(dat => {
            treez.push(dat)
        })
    })
    socket.on("swmpmons", data => {
        //isang besses lang dapat irun to 
        // kada simula ng server
        // pag isipan mabuti
        data.forEach(dat => {
            monz.push(dat)
        })
    })
    socket.on("monsWillChase", data => {
        monz = monz.map(mon => mon.monsId === data.monsId ? {...mon, isChasing: true, isAttacking: false, targHero: data.targHero} : mon)
        io.emit("monsIsChasing", data)
    })
    socket.on("monsWillAttack", data => {
        monz = monz.map(mon => mon.monsId === data.monsId ? {...mon, isAttacking: true, isChasing: false, targHero: data.targHero, pos: data.pos} : mon)
        io.emit("monsAttack", data)
    })
    socket.on("monsStopChasing", data => {
        monz = monz.map(mon => mon.monsId === data.monsId ? {...mon, isChasing: false, targHero: undefined} : mon)
    })
    socket.on("monsterIsHit", data => {
        monz = monz.map(mons => mons.monsId === data.monsId ? {...mons, hp: mons.hp -= data.dmgTaken} : mons)
        io.emit("monsterGotHit", data)
    })
    socket.on("monsDied", data => {
        monz = monz.filter(mons => mons.monsId !== data.monsId)
    })
    socket.on('playerIsHit', data => {
        io.emit("playerHitted", data)
    })
    socket.on("playerDied", data => {
        const theUzer = uzers.find(user => user._id === data._id)
        if(theUzer){
            const newArr = uzers.filter(user => user._id !== data._id)
            uzers = newArr
            monz = monz.map(mon => mon.targHero === data.monsId ? {...mon, isChasing: false, isAttacking: false, targHero: undefined} : mon)
            io.emit("aUserDied",{ _id:data._id, monsId: data.monsId})
        }else{log("a user not found ! line 153")}
    })
    // UNSHOW SWORD AFTER THROWING THE SWORD
    socket.on("unShowSword", data => {
        log(data._id)
        const theUser = uzers.find(uzer => uzer._id === data._id)
        if(!theUser) return log("line 172 unshowsword uzer not found on uzers")
        log('found')
        uzers = uzers.map(uzer => uzer._id === data._id ? {...uzer, weapon: "none"} : uzer)
        io.emit('swordhide', data)
    })
    socket.on("equipingSword", data => {

        uzers = uzers.map(uzer => uzer._id === data._id ? {...uzer, weapon: data.swordDetail, mode: data.mode} : uzer)
        io.emit("aUserEquipSword", data)
    })
    socket.on("pickSword", data => {
        io.emit("swordIsPicked", data)
    })
  

    socket.on("disconnect", () => {
        const theUzer = uzers.find(user => user.socketId === socket.id)
        if(theUzer){
            const newArr = uzers.filter(user => user.socketId !== socket.id)
            uzers = newArr
            io.emit("aUserDisconnect", theUzer._id)
        }else{log("a user disconnects not found !")}
    })
})

server.listen(PORT, () => log("TCP server is on"))