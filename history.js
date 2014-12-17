(function(){
    'use strict';

    CLASS({
        name : 'History',
        properties : ['domain', 'title', 'url', 'dateTimeOfDay', 'dateShort', 'dateRelativeDay'],
        templates: [
            function CSS(){/*
                .entry {
                  list-style: none;
                  margin: 0;
                  padding: 0;
                }
                .entry-box {
                  align-items: center;
                  display: flex;
                  margin-bottom: 6px;
                  max-width: 100%;
                  min-height: 2em;
                  overflow: hidden;
                  padding-bottom: 1px;

                  line-height: 1.75em;

                }
                .visit-entry {
                  display: flex;
                  min-width: 0;
                  -webkit-padding-start: 16px;
                 }

                .entry .time {
                  color: rgb(151, 156, 160);
                  min-width: 58px;
                  max-width: 90px;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                }
                .entry .title {
                  min-width: 0;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                }
                .entry .domain {
                  -webkit-padding-end: 6px;
                  -webkit-padding-start: 2px;
                  color: rgb(151, 156, 160);
                  min-width: -webkit-min-content;
                  overflow: hidden;
                  white-space: nowrap;
                }

            */},
            function toDetailHTML() {/*
                <li class='entry'>
                  <div class='entry-box'>
                     $$dateTimeOfDay{mode: 'read-only', className:'time'}
                      <div class='visit-entry'>
                          <div class='title'><a href=<%= this.data.url %> target='_top' title=%%title > $$url{mode: 'read-only'} </a></div>
                          <div class='domain'>$$domain{mode: 'read-only'}</div>
                      </div>
                  </div>
                </li>
            */}
        ]
    });


    CLASS({
        name: 'HistoryController',
        properties: [{
            name: 'dao',
            model_: 'DAOProperty', 
            view: 'DAOListView'
        }],
        methods: { 
            init: function () {
                this.SUPER();
                this.dao = EasyDAO.create({model: History, daoType: 'MDAO', name: 'history-foam'});

                //load data from array into dao
                console.log('load '+ HISTORY_DATA.length+' history entries from file.');
                HISTORY_DATA.select({
                    put: function(item){
                        this.dao.put(History.create(item));
                    }.bind(this)
                });
            }        
        },
        templates: [
            function toDetailHTML() {/*
            <section id="historyapp">
                <header id="header"><h1>History</h1></header>
                <section id="main">
                    $$dao{tagName: 'ul', mode:'read-only', id: 'history-list'}
                </section>
            </section>
            */}
        ]
    });
})();
