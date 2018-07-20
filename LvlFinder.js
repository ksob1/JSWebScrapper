(function(){
Object.merge = function(target, args){
   'use strict'
   if(target == null) throw new TypeError('Cannot convert null to an object');
   const to = Object(target);
   for(let i in args){
     if(Object.prototype.hasOwnProperty.call(args,i)){
       if(to.hasOwnProperty(i) && to[i] instanceof Array){
         to[i] = to[i].concat(args[i]);
       }else{
         to[i] = args[i]
       }
     }
   }
   return to;
}

function asyncPromise(generator, ...args){
  let g = generator(...args);
  
  function handle(result){
    if(result.done) return Promise.resolve(result.value);
    return Promise.resolve(result.value).then(res => handle(g.next(res)));
  }
  return handle(g.next());
}

function* getPlayers(world) {
    let i = 0,
        players = [];
    let maxPages = yield fetch(`https://cors-anywhere.herokuapp.com/https://www.margonem.pl/?task=ranking&w=${world}&p=${i}`).then(e => e.text()).then(r => {
       const parser = new DOMParser();
       const doc = parser.parseFromString(r, "text/html");
       const pages = Array.prototype.slice.call(doc.querySelectorAll('a[href*="p="]')).map(a => a.href);
       return pages[pages.length-1].replace(/(http|https)\:\/\/[a-zA-Z]*\.margonem\.pl\/\?task\=ranking\&w=[a-zA-Z]*\&p=/,'');
    });
    for (; i <= maxPages; i++) {
        let a = fetch(`https://cors-anywhere.herokuapp.com/https://www.margonem.pl/?task=ranking&w=${world}&p=${i}`).then(e => e.text());
        let result = yield a.then(res => {
            const players = {};
            const parser = new DOMParser();
            const doc = parser.parseFromString(res, "text/html");
            let elems = doc.querySelectorAll('#ranking tr');
            elems = Array.prototype.slice.apply(elems);
            elems.shift();
            elems.forEach(elem => {
                const playerID = elem.querySelector('a').href.replace(/(http|https)\:\/\/[a-zA-Z]*\.margonem\.pl\/\?task\=profile\&id=/, '');
                players[playerID] = players[playerID] || [];
                const nodes = Array.prototype.slice.apply(elem.querySelectorAll('td'));
                players[playerID].push({
                  name: nodes[1].innerText,
                  lvl: nodes[2].innerText,
                  ph: nodes[3].innerText,
                  prof: nodes[4].innerText,
                  active: nodes[5].innerText.indexOf('teraz') > -1
                });
            });
            return players;
        })
        Object.merge(players, result);
    }
    return players;
}


const dialog = document.createElement('div');
const minLvl = document.createElement('input');
const maxLvl = document.createElement('input');
const searchButton = document.createElement('div');
searchButton.innerText = 'Szukaj';
minLvl.type = maxLvl.type = 'number';
Object.assign(dialog.style, {
  'position':'absolute',
  'background-color': 'black',
  'width': '200px',
  'height':'200px',
  'left': '20px',
  'top': '20px',
  'z-index':'2000',
  'border-radius':'30px'
});

Object.assign(minLvl.style, {
  'position':'absolute',
  'width':'50px',
  'left': '15px',
  'top': '40px',
  'z-index':'201',
  'background-color':'#00bfff',
  'padding-left':'5px',
  'border-radius':'30px'
});
Object.assign(maxLvl.style, {
  'position':'absolute',
  'width':'50px',
  'left': '15px',
  'top': '70px',
  'z-index':'2001',
  'background-color':'#00bfff',
  'padding-left':'5px',
  'border-radius':'30px'
});
Object.assign(searchButton.style,{
  'position':'absolute',
  'width':'100px',
  'height':'20px',
  'left': '15px',
  'top': '110px',
  'z-index':'2001',
  'background-color':'#00bfff',
  'padding-left':'5px',
  'text-align':'center'
});
dialog.appendChild(minLvl);
dialog.appendChild(maxLvl);
dialog.appendChild(searchButton);
document.querySelector('body').appendChild(dialog);

searchButton.addEventListener('click',() => {
  asyncPromise(getPlayers,'dream').then(players => {
    const p = window.parsedPlayers = Object.keys(players).reduce((newArray, key) => {
      newArray.push({
       id: key,
       chars: players[key]
      });
      return newArray;
    },[]);    

    const meetRequirements = p.filter(pl => {
     return pl.chars.filter(c => c.lvl >= parseInt(minLvl.value) && c.lvl <= parseInt(maxLvl.value)).length > 0 && pl.chars.filter(c => c.active).length > 0;
    });

    mAlert(meetRequirements.map(p => {
      return [p.chars.filter(ch => ch.active)[0].name, p.chars.filter(ch => ch.lvl <= parseInt(maxLvl.value) && ch.lvl >= parseInt(minLvl.value))[0].name]
    }).reduce((str,elem) => {
      str += `Ma poziom na postaci: ${elem[0]}<br>
              Jest zalogowany na postaci: <span onclick='$("#a_ok").click();document.querySelector(\"#inpchat\").value = \"@${elem[1].replace('\n','').split(' ').join('_')} \";setTimeout(() =>$(\"#inpchat\").focus(),200)'>${elem[1]}</span><br><br>`;
      return str;
    },""));
  });
});
})(); 
