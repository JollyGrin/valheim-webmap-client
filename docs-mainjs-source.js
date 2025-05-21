(() => {
  'use strict';
  const e = {
    CANVAS_WIDTH: 2048,
    CANVAS_HEIGHT: 2048,
    PIXEL_SIZE: 12,
    EXPLORE_RADIUS: 100,
    DEFAULT_ZOOM: 200,
    ALWAYS_MAP: !1,
    ALWAYS_VISIBLE: !1
  };
  e.COORD_OFFSET = e.CANVAS_WIDTH / 2;
  const t = e,
    n = {},
    s = {
      players: (e, t) => {
        const s = t.replace(/^players\n/, '').split('\n\n'),
          i = [];
        s.forEach((e) => {
          const t = e.split('\n');
          if (void 0 === t[2]) return;
          const n = {
            id: t.shift(),
            name: t.shift(),
            health: t.shift(),
            maxHealth: t.shift(),
            flags: { dead: !1, pvp: !1, inbed: !1 }
          };
          if (
            ('hidden' == t[0] ? ((n.hidden = !0), t.shift()) : (n.hidden = !1), void 0 !== t[0])
          ) {
            const e = t.shift().split(',').map(parseFloat);
            (n.x = e[0]), (n.z = e[1]);
          }
          if (void 0 !== t[0]) {
            const e = t.shift(),
              s = ['dead', 'pvp', 'inbed'];
            console.log(e);
            for (let t = 0; t < s.length; t++)
              console.log(t + ' ' + s[t] + ' ' + e[t]), (n.flags[s[t]] = Boolean(Number(e[t])));
          }
          i.push(n);
        }),
          n.players.forEach((e) => {
            e(i);
          });
      },
      ping: (e) => {
        const t = e[2].split(','),
          s = { playerId: e[0], name: e[1], x: parseFloat(t[0]), z: parseFloat(t[1]) };
        n.ping.forEach((e) => {
          e(s);
        });
      },
      pin: (e) => {
        const t = e[4].split(',').map(parseFloat),
          s = { id: e[1], uid: e[0], type: e[2], name: e[3], x: t[0], z: t[1], text: e[5] };
        n.pin.forEach((e) => {
          e(s);
        });
      },
      rmpin: (e) => {
        n.rmpin.forEach((t) => {
          t(e[0]);
        });
      },
      messages: (e, t) => {
        const s = t.replace(/^messages\n/, '');
        var i = JSON.parse(s);
        n.messages.forEach((e) => {
          e(i);
        });
      },
      reload: (e) => {
        window.history.forward(1);
      }
    };
  Object.keys(s).forEach((e) => {
    n[e] = [];
  });
  let i = 0;
  const a = () => {
    const e = location.href.split('?')[0].replace(/^http/, 'ws'),
      t = new WebSocket(e);
    t.addEventListener('message', (e) => {
      const t = e.data.trim(),
        n = t.split('\n'),
        i = n.shift(),
        a = s[i];
      a ? a(n, t) : console.log('unknown websocket message: ', e.data);
    }),
      t.addEventListener('open', () => {
        (i = 0), t.send('players');
      }),
      t.addEventListener('close', () => {
        i++;
        const e = Math.min(i * (i + 1), 120);
        setTimeout(a, 1e3 * e);
      });
  },
    o = {
      init: a,
      addActionListener: (e, t) => {
        const s = n[e] || [];
        s.push(t), (n[e] = s);
      },
      getActionListeners: (e) => n[e] || []
    },
    d = {};
  document.querySelectorAll('[data-id]').forEach((e) => {
    d[e.dataset.id] = e;
  });
  const l = document.createElement('div'),
    c = (e, t = l) => {
      t.innerHTML = e;
      const n = {};
      return (
        t.querySelectorAll('[data-id]').forEach((e) => {
          n[e.dataset.id] = e;
        }),
        { el: t.children[0], ui: n }
      );
    },
    r = d,
    { canvas: p, map: h, mapBorder: m, mapBorderCircle: f } = r;
  let L = t.CANVAS_WIDTH,
    E = t.CANVAS_HEIGHT,
    y = t.EXPLORE_RADIUS,
    g = t.PIXEL_SIZE,
    u = t.COORD_OFFSET;
  document.createElement('img').src = 'mapIcons.png';
  const A = p.getContext('2d');
  let v, x;
  const I = document.createElement('canvas'),
    w = I.getContext('2d');
  let _ = 100;
  const T = [],
    S = {};
  let C;
  const O = (e) => {
    const t = e.el.getBoundingClientRect(),
      n = window.innerWidth / 2 - t.left,
      s = window.innerHeight / 2 - t.top;
    (Math.abs(n) > 0.5 || Math.abs(s) > 0.5) &&
      ((h.style.left = n + h.offsetLeft + 'px'), (h.style.top = s + h.offsetTop + 'px'));
  };
  let M = !1;
  const W = () => {
    clearTimeout(D), (M = !0), setTimeout(D, 250);
  },
    D = () => {
      (M = !1),
        T.forEach((e) => {
          let t = !1;
          e.el ||
            ((t = !0),
              (e.el = ((e) => {
                const t = document.createElement('div');
                (t.id = e.id),
                  (t.className = `mapText mapIcon ${e.type}`),
                  e.zIndex && (t.style.zIndex = e.zIndex);
                const n = document.createElement('div');
                return (
                  (n.className = 'center text'),
                  (n.textContent = e.text),
                  t.appendChild(n),
                  e.node && t.appendChild(e.node),
                  t
                );
              })(e)),
              h.appendChild(e.el));
          const n = e.type in S && S[e.type];
          if (
            ((e.el.style.display = n || e.hidden ? 'none' : 'block'),
              e.flags &&
              Object.keys(e.flags).forEach((t) => {
                e.flags[t] ? e.el.classList.add(t) : e.el.classList.remove(t);
              }),
              !t && e.static)
          )
            return;
          const s = e.x / g + u,
            i = E - (e.z / g + u);
          (e.el.style.left = (100 * s) / L + '%'), (e.el.style.top = (100 * i) / E + '%');
        }),
        C && O(C);
    };
  window.addEventListener('mousemove', (e) => {
    const t = h.offsetWidth / L,
      n = g * (-u + (e.clientX - h.offsetLeft) / t),
      s = g * (E - u + (h.offsetTop - e.clientY) / t);
    r.coords.textContent = `${n.toFixed(2)} , ${s.toFixed(2)}`;
  });
  const R = (e) => {
    const t = T.indexOf(e);
    t > -1 && (T.splice(t, 1), e.el && (e.el.remove(), (e.el = void 0)));
  },
    b = () => {
      A.clearRect(0, 0, L, E),
        (A.globalCompositeOperation = 'source-over'),
        A.drawImage(v, 0, 0),
        (A.globalCompositeOperation = 'multiply'),
        A.drawImage(I, 0, 0),
        W();
    },
    z = function(e, t, n) {
      void 0 === t && ((t = window.innerWidth / 2), (n = window.innerHeight / 2));
      const s = _,
        i = 8e3 * devicePixelRatio;
      (e = Math.min(Math.max(Math.round(e), 50), i)),
        (_ = e),
        (h.style.width = `${e}%`),
        (h.style.height = h.offsetWidth + 'px');
      const a = _ / s;
      (h.style.left = a * (h.offsetLeft - t) + t + 'px'),
        (h.style.top = a * (h.offsetTop - n) + n + 'px'),
        W();
    };
  let P;
  const N = (e) => {
    (L = t.CANVAS_WIDTH),
      (E = t.CANVAS_HEIGHT),
      (y = t.EXPLORE_RADIUS),
      (g = t.PIXEL_SIZE),
      (u = t.COORD_OFFSET),
      (p.width = L),
      (p.height = E),
      (h.style.width = '100%'),
      (h.style.height = h.offsetWidth + 'px'),
      (h.style.left = (window.innerWidth - h.offsetWidth) / 2 + 'px'),
      (h.style.top = (window.innerHeight - h.offsetHeight) / 2 + 'px'),
      (I.width = L),
      (I.height = E),
      (w.fillStyle = '#ffffff'),
      m.setAttribute('viewBox', `0 0 ${L} ${E}`),
      f.setAttribute('cx', L / 2),
      f.setAttribute('cy', L / 2),
      f.setAttribute('r', 0.4275 * L),
      (v = e.mapImage),
      (x = e.fogImage),
      w.drawImage(x, 0, 0),
      b();
    const n = (e, t = 1) => {
      h.classList.add('zooming');
      const n = _,
        s = Math.max(Math.floor(n / 5), 1) * t,
        i = 0 === e.deltaY ? e.deltaX : e.deltaY;
      z(i > 0 ? n - s : n + s, e.clientX, e.clientY),
        clearTimeout(P),
        (P = setTimeout(() => {
          h.classList.remove('zooming');
        }, 100));
    };
    e.zoom && z(e.zoom),
      window.addEventListener('wheel', n),
      window.addEventListener('resize', () => {
        h.style.height = h.offsetWidth + 'px';
      });
    const s = {};
    let i,
      a = !1;
    ((e, t) => {
      const n = new Map();
      let s = [];
      const i = (e) => {
        n.delete(e.pointerId),
          (s = s.filter((t) => t.event.pointerId !== e.pointerId)),
          t.up && t.up(s);
      };
      e.addEventListener('pointerdown', (e) => {
        const i = { downEvent: e, event: e };
        n.set(e.pointerId, i), s.push(i), t.down && t.down(s);
      }),
        window.addEventListener('pointermove', (e) => {
          const i = n.get(e.pointerId);
          i && ((i.event = e), t.move && t.move(s));
        }),
        window.addEventListener('pointerup', i),
        window.addEventListener('pointercancel', i);
    })(window, {
      down: (e) => {
        1 === e.length
          ? ((s.x = h.offsetLeft), (s.y = h.offsetTop))
          : 2 === e.length && ((a = !0), (i = void 0));
      },
      move: (e) => {
        if (1 !== e.length || a || C) {
          if (2 === e.length) {
            const t = e[0].event.clientX,
              s = e[0].event.clientY,
              a = e[1].event.clientX,
              o = e[1].event.clientY,
              d = t - a,
              l = s - o,
              c = Math.sqrt(d * d + l * l);
            i && n({ deltaY: i - c || -1, clientX: (t + a) / 2, clientY: (s + o) / 2 }, 0.08),
              (i = c);
          }
        } else {
          const t = e[0].event;
          (h.style.left = s.x + (t.clientX - e[0].downEvent.clientX) + 'px'),
            (h.style.top = s.y + (t.clientY - e[0].downEvent.clientY) + 'px'),
            W();
        }
      },
      up: (e) => {
        0 === e.length && (a = !1);
      }
    });
  },
    H = (e, t = !0) => {
      e.id || (e.id = `id_${Date.now()}_${Math.random()}`), T.push(e), t && W();
    },
    V = R,
    k = (e) => {
      const t = T.indexOf(e);
      (e.hidden = !0), t > -1 && e.el && (e.el.style.display = 'none');
    },
    F = (e) => {
      const t = T.indexOf(e);
      (e.hidden = !1), t > -1 && e.el && (e.el.style.display = 'block');
    },
    Y = (e, t) => {
      S[e] = t;
    },
    X = (e) => {
      (C = e), C && O(C);
    },
    B = b,
    $ = W,
    U = {};
  let Z;
  const j = (e) => {
    Z && Z.playerListEntry.el.classList.remove('selected'),
      e && e !== Z
        ? ((Z = e),
          Z.playerListEntry.el.classList.add('selected'),
          r.map.classList.remove('smooth'),
          X(e),
          (r.topMessage.textContent = `Following ${Z.name}`),
          setTimeout(() => {
            r.map.classList.add('smooth');
          }, 0))
        : ((Z = null),
          X(null),
          r.map.classList.remove('smooth'),
          (r.topMessage.textContent = ''));
  },
    G = () => {
      o.addActionListener('players', (e) => {
        let n = Object.keys(U),
          s = e.map((e) => e.id);
        n
          .filter((e) => !s.includes(e))
          .forEach((e) => {
            U[e] === Z && j(null), U[e].playerListEntry.el.remove(), V(U[e]), delete U[e];
          }),
          e.forEach((e) => {
            let n = U[e.id];
            if (!n) {
              const s = c(
                '\n                    <div class="playerListEntry">\n                        <div class="name" data-id="name"></div>\n                        <div class="details" data-id="details">\n                            <div class="hpBar" data-id="hpBar">\n                                <div class="hp" data-id="hp"></div>\n                                <div class="hpText" data-id="hpText"></div>\n                            </div>\n                        </div>\n                    </div>\n                '
              );
              (s.ui.name.textContent = e.name),
                (n = { ...e, type: 'player', text: e.name, zIndex: 5, playerListEntry: s }),
                H(n, !1),
                e.hidden && !t.ALWAYS_VISIBLE && (s.ui.details.style.display = 'none'),
                (U[e.id] = n),
                s.el.addEventListener('click', () => {
                  n.hidden ||
                    (r.playerListTut && (r.playerListTut.remove(), (r.playerListTut = void 0)),
                      j(n));
                }),
                r.playerList.appendChild(s.el);
            }
            (!t.ALWAYS_VISIBLE && e.hidden) || !n.hidden
              ? t.ALWAYS_VISIBLE ||
              !e.hidden ||
              n.hidden ||
              (k(n), (n.playerListEntry.ui.details.style.display = 'none'), Z === n && j(null))
              : (F(n), (n.playerListEntry.ui.details.style.display = 'block')),
              (n.lastUpdate = Date.now()),
              (n.x = e.x),
              (n.z = e.z),
              (n.flags = e.flags),
              console.log(e.flags),
              console.log(n.flags),
              (n.playerListEntry.ui.hp.style.width =
                100 * Math.max(e.health / e.maxHealth, 0) + '%'),
              (n.playerListEntry.ui.hpText.textContent = `${Math.round(Math.max(e.health, 0))} / ${Math.round(e.maxHealth)}`),
              (!e.hidden || t.ALWAYS_MAP || t.ALWAYS_VISIBLE) &&
              ((e, t) => {
                const n = y / g,
                  s = e / g + u,
                  i = E - (t / g + u);
                w.beginPath(), w.arc(s, i, n, 0, 2 * Math.PI), w.fill(), b();
              })(e.x, e.z);
          }),
          $();
      });
    },
    q = document.createElement('img'),
    J = document.createElement('img'),
    K = fetch('config')
      .then((e) => e.json())
      .then((e) => {
        (t.CANVAS_WIDTH = e.texture_size || 2048),
          (t.CANVAS_HEIGHT = e.texture_size || 2048),
          (t.PIXEL_SIZE = e.pixel_size || 12),
          (t.EXPLORE_RADIUS = e.explore_radius || 100),
          (t.UPDATE_INTERVAL = e.update_interval || 0.5),
          (t.WORLD_NAME = e.world_name),
          (t.WORLD_START_POSITION = ((e) => {
            const t = e.split(',');
            return { x: parseFloat(t[0]), y: parseFloat(t[1]), z: parseFloat(t[2]) };
          })(e.world_start_pos)),
          (t.DEFAULT_ZOOM = e.default_zoom || 200),
          (t.MAX_MESSAGES = e.max_messages || 100),
          (t.ALWAYS_MAP = e.always_map),
          (t.ALWAYS_VISIBLE = e.always_visible),
          (document.title = `Valheim WebMap - ${t.WORLD_NAME}`),
          ((e = '') => {
            const t = document.createElement('style');
            t.appendChild(document.createTextNode(e)), document.head.appendChild(t), t.sheet;
          })(
            `\n\t\t.mapIcon.player {\n\t\t\ttransition: top ${t.UPDATE_INTERVAL}s linear, left ${t.UPDATE_INTERVAL}s linear;\n\t\t}\n\t\t.map.smooth {\n\t\t\ttransition: top ${t.UPDATE_INTERVAL}s linear, left ${t.UPDATE_INTERVAL}s linear;\n\t\t}\n\t`
          );
      });
  (async () => {
    await Promise.all([
      new Promise((e) => {
        fetch('map')
          .then((e) => e.blob())
          .then((t) => {
            (q.onload = e), (q.src = URL.createObjectURL(t));
          });
      }),
      new Promise((e) => {
        (J.onload = e), (J.src = 'fog');
      }),
      K
    ]),
      N({ mapImage: q, fogImage: J, zoom: t.DEFAULT_ZOOM }),
      H({ type: 'start', x: t.WORLD_START_POSITION.x, z: t.WORLD_START_POSITION.z, static: !0 });
    const e = {};
    o.addActionListener('ping', (t) => {
      let n = e[t.playerId];
      n || ((n = { ...t }), (n.type = 'ping'), (n.text = t.name), H(n, !1), (e[t.playerId] = n)),
        (n.x = t.x),
        (n.z = t.z),
        $(),
        clearTimeout(n.timeoutId),
        (n.timeoutId = setTimeout(() => {
          delete e[t.playerId], V(n);
        }, 8e3));
    }),
      fetch('pins')
        .then((e) => e.text())
        .then((e) => {
          e.split('\n').forEach((e) => {
            const t = e.split(',');
            if (t.length > 5) {
              const e = {
                id: t[1],
                uid: t[0],
                type: t[2],
                name: t[3],
                x: t[4],
                z: t[5],
                text: t[6],
                static: !0
              };
              H(e, !1);
            }
          }),
            $();
        }),
      o.addActionListener('pin', (e) => {
        H(e);
      }),
      o.addActionListener('rmpin', (e) => {
        ((e) => {
          const t = T.find((t) => t.id === e);
          t && R(t);
        })(e);
      });
    const n = document.createElement('table');
    o.addActionListener('messages', (e) => {
      for (
        e.forEach((e) => {
          const t = c(
            '\n\t\t<tr class="message">\n\t\t    <td class="datetime">\n\t\t        <span class="date" data-id="date"></span>\n\t\t        <span class="time" data-id="time"></span>\n\t\t    </td>\n\t\t    <td class="name" data-id="name"></td>\n\t\t    <td class="text" data-id="message"></td>\n\t\t</tr>\n            ',
            n
          );
          var s = new Date(e.ts);
          (t.ui.date.textContent = s.toLocaleDateString()),
            (t.ui.time.textContent = s.toLocaleTimeString()),
            (t.ui.name.textContent = e.name),
            (t.ui.message.innerHTML = markdown(e.message)),
            'Server' == e.name && t.el.firstChild.classList.add('server'),
            t.el.firstChild.classList.add('type' + e.type),
            r.messageList.appendChild(t.el.firstChild);
        });
        document.getElementById('messages').childElementCount > t.MAX_MESSAGES;

      )
        document.getElementById('messages').childNodes[0].remove();
    }),
      fetch('messages')
        .then((e) => e.json())
        .then((e) => {
          e.length > 0 &&
            o.getActionListeners('messages').forEach((t) => {
              t(e);
            });
        }),
      window.addEventListener('resize', () => {
        B();
      }),
      r.menuBtn.addEventListener('click', () => {
        r.menu.classList.toggle('menuOpen');
      });
    const s = (e) => {
      const t = e.target.closest('.menu'),
        n = e.target.closest('.menu-btn');
      t || n || r.menu.classList.remove('menuOpen');
    };
    window.addEventListener('mousedown', s), window.addEventListener('touchstart', s);
    const i = r.menu.querySelectorAll('.hideIconTypeCheckbox');
    i.forEach((e) => {
      e.addEventListener('change', () => {
        Y(e.dataset.hide, e.checked || r.hideAll.checked),
          'all' === e.dataset.hide &&
          i.forEach((t) => {
            Y(t.dataset.hide, e.checked || t.checked);
          }),
          $();
      });
    }),
      r.hideMessageList.addEventListener('change', () => {
        r.hideMessageList.checked
          ? (r.messageList.style.left = -r.messageList.offsetWidth + 'px')
          : (r.messageList.style.left = 0);
      }),
      r.hidePlayerList.addEventListener('change', () => {
        r.hidePlayerList.checked
          ? (r.playerListContainer.style.right = -r.playerListContainer.offsetWidth + 'px')
          : (r.playerListContainer.style.right = 0);
      }),
      G(),
      o.init();
  })();
})();
