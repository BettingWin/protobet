"use strict"

const domain = 'http://150.95.176.156:7000'

const select = x => document.querySelector(x)
const selectAll = x => [].slice.call(document.querySelectorAll(x))
const sexp2json = (s) => {
  if (s === '(Left List)\r\n')
    s = '(Left )'

  s = s.replace(/(\\\d{3})+/g, (raw) => {
    const handled = raw.split('\\').map(x => parseFloat(x).toString(16)).join('%').replace('NaN', '')
    return decodeURIComponent(handled)
  })

  s = s.replace(/[^(]Map\r\n/g, '(Map )\r\n').replace(/\r\n\s+/g, ' ')
  const str_replace_map = {}
  let str_count = 0
  s = s.replace(/".*?"/g, raw => {
    const replacement = 'S2J@' + str_count++
    str_replace_map[replacement] = raw
    return replacement
  })

  s = s.replace(/\((\w+)\s*/g, '{"$1":[').replace(/\)/g, ']}').replace(/\ /g, ',')

  for (const r in str_replace_map) {
    s = s.replace(r, str_replace_map[r])
  }
  return JSON.parse(s)
}

let ajax_lock = false
const ajaxGet = (x, y, no_alert) => {
  if (ajax_lock) {
    if (!no_alert)
      alert('processing previous command...please wait...')
    return
  }

  ajax_lock = true
  select('#tip').innerHTML = `Processing ${x.split('?')[0].toUpperCase()}...`
  select('#tip').style.display = 'block'

  $.get(domain + x, x => {
    ajax_lock = false
    select('#tip').style.display = 'none'
  
    if (x.err) {
      if (x.content.indexOf('does not exist') !== -1)
        alert("This contract hasn't been broadcasted to the alphanet yet.")
      else
        alert(x.content)
    } else {
      y(x)
    }
  }) 
}

window.PB = {}
window.state = {}
window.view = {
  key: () => {
    select('#key_name').innerHTML = window.state.key_name
    select('#key').innerHTML = window.state.key
  },
  balance: () => {
    select('#balance').innerHTML = window.state.balance
  }
}

PB.form_json = selector => {
  const inputs = [].slice.call((typeof selector === 'string' ? select(selector) : selector).querySelectorAll('[name]'))
  const json = {}
  inputs.forEach(x => {
    const type = x.getAttribute('type')
    if (type === 'radio' && !x.checked)
      return

    const name = x.getAttribute('name')
    if (!(name in json))
      json[name] = x.value
    else if (!(json[name] instanceof Array))
      json[name] = [json[name], x.value]
    else
      json[name].push(x.value)
  })

  return json
}

PB.add_choice = () => {
  const clone_node = select('#choice-lst li').cloneNode(true)
  clone_node.querySelector('input').value = ''
  select('#choice-lst').appendChild(clone_node)  
}

PB.remove_choice = () => {
  const lines = selectAll('#choice-lst li')
  if (lines.length > 1) {
    const line = lines.pop()
    line.parentNode.removeChild(line)
  }
}

PB.create_acct = () => {
  ajaxGet('/gen', x => {
    localStorage.setItem('key', x.key)
    localStorage.setItem('key_name', x.key_name)
    window.state.key = x.key
    window.state.key_name = x.key_name

    window.view.key()

    PB.add_balance()
  })
}

PB.add_balance = () => {
  ajaxGet('/add_balance?' + window.state.key_name, x => {
    const balance = x.content.trim()
    localStorage.setItem('balance', balance)
    window.state.balance = balance

    window.view.balance()
  })
}

PB.refresh_balance = () => {
  ajaxGet('/get_balance?' + window.state.key_name, x => {
    const balance = x.content.trim()
    localStorage.setItem('balance', balance)
    window.state.balance = balance

    window.view.balance()
  })
}

PB.create_bet = () => {
  const data = PB.form_json('.bet-creator')
  if (!data.title) {
    alert('please input data title')
    return
  } else if (!data.be || isNaN(+new Date(data.be))) {
    alert('please input the correct betting end time')
    return
  } else if (!data.ve || isNaN(+new Date(data.ve))) {
    alert('please input the correct voting end time')
    return
  } else if (new Date(data.be) < new Date()) {
    alert('betting end time should be later than now')
    return
  } else if (new Date(data.ve) < new Date(data.be)) {
    alert('voting end time should be later than betting end time')
    return
  }

  data.key_name = window.state.key_name
  const params = encodeURIComponent(JSON.stringify(data))
  ajaxGet('/create_bet?' + params, x => {
    PB.render_bet_lst()
  })
}

PB.bet = (contract_name, node) => {
  const data = PB.form_json(node.parentNode)
  data.key = window.state.key
  data.key_name = window.state.key_name
  data.contract_name = contract_name
  if (!data.op_amount) {
    alert('please input tez amount')
    return
  } else if (!data.op_choice) {
    alert('please select your choice')
    return
  }

  const params = encodeURIComponent(JSON.stringify(data))
  
  ajaxGet('/bet?' + params, x => {
    PB.render_bet_lst(PB.refresh_balance)
  })
}

PB.vote = (contract_name, node) => {
  const data = PB.form_json(node.parentNode)
  data.key = window.state.key
  data.key_name = window.state.key_name
  data.contract_name = contract_name
  if (!data.op_choice) {
    alert('please select your choice')
    return
  }

  const params = encodeURIComponent(JSON.stringify(data))
  
  ajaxGet('/vote?' + params, x => {
    PB.render_bet_lst()
  })
}

PB.render_bet_lst = (cb) => {
  ajaxGet('/bet_lst', bet_map => {
    select('.bet-wrapper').innerHTML = ''
    for (const contract_name in bet_map) {
      const bet = bet_map[contract_name]
      const template = select('#bet-template').cloneNode(true)
      template.removeAttribute('id')
      template.style.display = 'inline-block'
      
      const storage = sexp2json(bet.storage)
      if (storage.Left)
        continue
      
      const lst_content = storage.Right[0].Pair[1].Pair[1].Pair[1].split('|')
      const date_content = storage.Right[0].Pair[1].Pair[1].Pair[0].Pair
      const bet_content = storage.Right[0].Pair[1].Pair[0].Map
      const vote_content = storage.Right[0].Pair[0].Map

      template.querySelector('h3').innerHTML = lst_content[0]
      template.querySelector('.be').innerHTML = date_content[0]
      template.querySelector('.ve').innerHTML = date_content[1]

      let has_bet = false
      let has_voted = false
      const bet_count = lst_content.map(x => 0)
      const vote_count = lst_content.map(x => 0)
      bet_content.forEach(x => {
        template.querySelector('.bets').innerHTML += `
        <li>
          <span>${x.Item[0]}</span> bet 
          <i> ${x.Item[1].Pair[0]} ꜩ </i> 
          on choice <b> ${lst_content[x.Item[1].Pair[1]]} </b>
        </li>
        `
        bet_count[x.Item[1].Pair[1]] += 1
        if (x.Item[0] === window.state.key)
          has_bet = true
      })
      if (!bet_content.length)
        template.querySelector('.bets').innerHTML = '<li>Empty</li>'

      vote_content.forEach(x => {
        vote_count[x.Item[0]] = x.Item[1].Set.length
        x.Item[1].Set.forEach(key => {
          template.querySelector('.votes').innerHTML += `
          <li>
            <span>${key}</span> vote for choice: <b> ${lst_content[x.Item[0]]} </b>            
          </li>
          `
          if (key === window.state.key)
            has_voted = true
        })
      })
      if (!vote_content.length)
        template.querySelector('.votes').innerHTML = '<li>Empty</li>'

      bet_count.shift()
      vote_count.shift()

      let max_vote_index = -1
      let max_vote = 0
      vote_count.forEach((x, i) => {
        if (x > max_vote) {
          max_vote_index = i
          max_vote = x          
        }
      })

      lst_content.forEach((x, i) => {
        if (!i) return

        template.querySelector('.op-bet .choices').innerHTML += `
          <label><input name="op_choice" type="radio" value="${i}"  />${x}</label><br>
        `  
        template.querySelector('.op-vote .choices').innerHTML += `
          <label><input name="op_choice" type="radio" value="${i}" />${x}</label><br>
        `
      })

      const now = +new Date()
      const be = +new Date(date_content[0])
      const ve = +new Date(date_content[1])
      
      if (now < be && !has_bet) {
        template.querySelector('.op-bet').style.display = 'block'
        template.querySelector('.op-bet button').setAttribute('onclick', `PB.bet("${contract_name}", this)`)
      }
      if (now >= be && now < ve && !has_voted) {
        template.querySelector('.op-vote').style.display = 'block'
        template.querySelector('.op-vote button').setAttribute('onclick', `PB.vote("${contract_name}", this)`)
      }

      if (now > ve) {
        template.className += ' closed'
        template.querySelector('h3').innerHTML += '(unsettled)'
        if (bet_content.length && vote_content.length && max_vote_index >= 0 && bet_count[max_vote_index] > 0)
          ajaxGet('/settle?' + contract_name, x => {
            if (!x.err)
              PB.render_bet_lst()
          }, true)
      }

      $('.bet-wrapper').prepend(template)
    }

    cb && cb()
  })
}