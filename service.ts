import { createServer } from 'http'
import { spawn } from 'child_process'

const contract_loc = '/root/protobet/protobet.tz'
const port = 7000
const btoa = (x : string) => new Buffer(x).toString('base64')

const bet_map : any = {}

const alphanet = (args : string[], no_client : boolean = false) => {
  if (!no_client) 
    args.unshift('client')

  console.log('running alphanet ' + args)
  return new Promise<{err: number, content: string}>((resolve) => {
    const alphanet = spawn('alphanet', args, {stdio: [process.stdin, 'pipe', 'pipe']})
    
    let data = ''
    alphanet.stdout.on('data', (x) => {
      data += x
    })
    alphanet.stdout.on('err', (x) => {
      data += x
    })
    alphanet.on('close', x => {
      resolve({content: data, err: x})
    })
  })
}
alphanet('list known contracts'.split(' ')).then(x => {
  x.content.split('\r\n').forEach(line => {
    const line_arr = line.trim().split(': ')
    if (line_arr.length > 1)
      if (line_arr[0].indexOf('BET_') === 0) {
        alphanet(('get storage for ' + line_arr[0]).split(' ')).then(storage => {
          if (!storage.err) {
            bet_map[line_arr[0]] = {
              storage: storage.content
            }
          }
        })
      }
  })
})

const server = createServer((req, response) => {
  response.setHeader('Connection', 'Transfer-Encoding')
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Transfer-Encoding', 'chunked')
  response.setHeader('Access-Control-Allow-Origin', '*')

  console.log(`Request to ${req.url}`)

  const output = (x : any) => response.end(JSON.stringify(x))

  const router : any = {
    '/': async function(params : string) {
      output({hellow: 'world'})
    },
    '/gen': async function(params : string) {
      const key_name = btoa((new Date()).toISOString())
      const gen_key_result = await alphanet(['gen', 'keys', key_name])
      if (gen_key_result.err) {
        output(gen_key_result)
        return
      }

      const list_result = await alphanet(['list', 'known', 'contracts'])
      if (list_result.err) {
        output(list_result)
        return
      }

      const key_map : {[_ : string] : string} = {}
      list_result.content.split('\r\n').forEach(line => {
        const line_arr = line.trim().split(': ')
        if (line_arr.length > 1)
          key_map[line_arr[0]] = line_arr[1]
      })
      
      output(Object.assign(gen_key_result, {
        key_name,
        key: key_map[key_name]
      }))
    },
    '/get_balance': async function(key_name : string){
      const balance = await alphanet(`get balance for ${key_name}`.split(' '))
      output(balance)
    },
    '/add_balance': async function(key_name : string){
      const acct_name = btoa((new Date()).toISOString())
      
      const free_account = await alphanet(`originate free account ${acct_name} for ${key_name}`.split(' '))
      if (free_account.err) {
        output(free_account)
        return
      }
      
      const transfer = await alphanet(`transfer 99999 from ${acct_name} to ${key_name}`.split(' '))
      if (transfer.err) {
        output(transfer)
        return
      }

      const check_balance = await alphanet(`get balance for ${key_name}`.split(' '))
      output(check_balance)
    },
    '/create_bet': async function(params : string){
      const input = JSON.parse(decodeURIComponent(params))
      if (!(input.choice instanceof Array))
        input.choice = [input.choice]

      const init_storage = `(Right (Pair (Map ) (Pair (Map ) (Pair (Pair "${input.be.replace(/\.\d{3}/, '')}" "${input.ve.replace(/\.\d{3}/, '')}") "${input.title}|${input.choice.join('|')}"))))`
      console.log(init_storage)
      const bet_name = 'BET_' + btoa(input.title)
      const args = `originate contract ${bet_name} for ${input.key_name} transferring 2.01 from ${input.key_name} running container:${contract_loc} -init`.split(' ').concat(init_storage)
      const bet_contract = await alphanet(args)
      if (!bet_contract.err)
        bet_map[bet_name] = {storage: init_storage}

      output(Object.assign(bet_contract, {storage: init_storage}))
    },
    '/bet': async function(params : string){
      const input = JSON.parse(decodeURIComponent(params))
      const contract_arg = `(Left (Left (Pair "${input.key}" ${input.op_choice})))`
      const args = `transfer ${input.op_amount} from ${input.key_name} to ${input.contract_name} -arg`.split(' ').concat(contract_arg)
      const bet_result = await alphanet(args)
      if (bet_result.err) {
        output(bet_result)
        return
      }

      const storage_result = await alphanet(`get storage for ${input.contract_name}`.split(' '))
      if (!storage_result.err)
        bet_map[input.contract_name] = {storage: storage_result.content}

      output(Object.assign(bet_result, {storage: storage_result}))
    },
    '/vote': async function(params : string){
      const input = JSON.parse(decodeURIComponent(params))
      const contract_arg = `(Left (Right (Pair ${input.op_choice} "${input.key}")))`
      const args = `transfer 0 from ${input.key_name} to ${input.contract_name} -arg`.split(' ').concat(contract_arg)
      const vote_result = await alphanet(args)
      if (vote_result.err) {
        output(vote_result)
        return
      }

      const storage_result = await alphanet(`get storage for ${input.contract_name}`.split(' '))
      if (!storage_result.err)
        bet_map[input.contract_name] = {storage: storage_result.content}

      output(Object.assign(vote_result, {storage: storage_result}))
    },
    '/settle': async function(contract_name : string){
      const contract_arg = '(Right Unit)'
      const settlement = await alphanet(`transfer 0 from my_account to ${contract_name} -arg`.split(' ').concat(contract_arg))
      if (!settlement.err){
        const storage_result = await alphanet(`get storage for ${contract_name}`.split(' '))
        if (!storage_result.err)
          bet_map[contract_name] = {storage: storage_result.content}
      }

      // const forget = await alphanet(`forget contract ${contract_name}`.split(' '))
      // if (forget.err){
      //   output(forget)
      //   return
      // }
      
      output(settlement)
    },
    '/bet_lst': async function() {
      output(bet_map)
    }
  }

  const [path, params] = (req.url || '').split('?')

  if (path in router) {
    router[path](params)
  } else {
    output({})
  }
  
})

server.listen(port)

console.log(`Listening on port ${port}`)