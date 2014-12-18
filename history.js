(function(){
    'use strict';

    CLASS({
        name : 'History',
        properties : ['domain', 'title', 'url', 'dateTimeOfDay', 'dateShort', 'dateRelativeDay',
        {
          name: 'favicon',
          mode: 'read-only',
          defaultValue:'',
          getter: function() {
              // TODO: For mobile use: getFaviconImageSet(this.url, 32, 'touch-icon')
              return CHROME.getFaviconImageSet(this.url);
          }
        }],
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
            // TODO: this should be broken down into smaller views
            // TODO: for favicon add style='background-image: <%= this.data.favicon %>' to visit-entry
            function toDetailHTML() {/*
                <li class='entry'>
                  <div class='entry-box'>
                     $$dateTimeOfDay{mode: 'read-only', className:'time'}
                      <div class='visit-entry'>
                          <div class='title'>
                            <a href=<%= this.data.url %> target='_top' title=<%= this.data.title %> >
                             $$title{mode: 'read-only'} 
                            </a>
                          </div>
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
            model_: 'DAOProperty'
        },
        {
            name: 'filteredDAO',
            model_: 'DAOProperty', 
            view: 'DAOListView'
        },
        {
          name: 'groups'
        },
        {
          name: 'query',
          label: 'Query',
          view: {factory_: 'TextFieldView', placeholder: 'Search', onKeyMode: true},
          // TODO: consider using a listener instead of postSet
          postSet: function(_, q) {
            console.log('filter: ' + q);
            // TODO: we should search all properties not just title, also make it
            // case insensitive
            this.filteredDAO = this.dao.where(CONTAINS_IC(History.TITLE ,q));
          }
        }],
        listeners: [
          {
            name: 'onDAOUpdate',
            isFramed: true,
            code: function () {
              this.dao.select(GROUP_BY(History.DATE_RELATIVE_DAY))(function (q) {
                this.groups = q.groups;
              }.bind(this));
            }
          }
        ],
        methods: { 
            init: function () {
                this.SUPER();
                this.dao = EasyDAO.create({model: History, daoType: 'MDAO', name: 'history-foam'});

                // load data from array into dao
                console.log('loading ' + HISTORY_DATA.length + ' history entries from file.');
                HISTORY_DATA.select({
                    put: function(item){
                        this.dao.put(History.create(item));
                    }.bind(this)
                });

                this.filteredDAO = this.dao;

                // update groups
                this.filteredDAO.listen(this.onDAOUpdate);
                this.onDAOUpdate();
            }        
        },
        templates: [
            function CSS() {/*
              #historyapp {
                padding-top: 50px;
              }
              #header {
                position:fixed;
                top:0;
                height: 50px;
                width:100%;
                z-index:3;
                background-image: -webkit-linear-gradient(white, white 40%, rgba(255, 255, 255, 0.92));
                border-bottom: 1px solid black;
              }
              #search {
                position: absolute;
                right: 20px;
                top: 20px;
              }
            */},
            function toDetailHTML() {/*
              <section id="historyapp">
                  <header id="header"><h1>History</h1>$$query{mode:'read-write', id:'search'}</header>
                  <div id="result">
                      $$filteredDAO{tagName: 'ul', mode:'read-only', id: 'history-list'}
                  </div>
              </section>
            */}
        ]
    });
})();

