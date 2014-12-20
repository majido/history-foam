(function(){
  'use strict';

  CLASS({
    name : 'History',
    properties : ['ID', 'domain', 'url', 'time', 'dateTimeOfDay', 'dateShort', 'dateRelativeDay',
    {
      name:'title',
      getter: function(){
        return this.instance_.title ?
          this.instance_.title :
          this.instance_.title = this.url;
      }
    },
    {
      name: 'favicon',
      mode: 'read-only',
      defaultValue:'',
      getter: function() {
        if (CHROME.isExtension)
          // TODO: For mobile use: getFaviconImageSet(this.url, 32, 'touch-icon')
          return CHROME.utils.getFaviconImageSet(this.url);
        else
          return '';
      }
    }
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
      view: 'HistoryListView'
    },
    {
      name: 'query',
      label: 'Query',
      view: {factory_: 'TextFieldView', placeholder: 'Search', onKeyMode: true},
      // TODO: consider using a listener instead of postSet
      postSet: function(_, q) {
        console.log('filter: ' + q);
        // TODO: we should search all properties not just title
        this.filteredDAO = this.dao.where(CONTAINS_IC(History.TITLE ,q));
      }
    }],
    listeners: [
      {
        name: 'onDAOUpdate',
        isFramed: true,
        code: function () {
        }
      },
      {
        name: 'onItemRemoved',
        isFramed: true,
        code: function () {
        }
      }
    ],
    methods: { 
      init: function () {
        this.SUPER();
        this.dao = EasyDAO.create({model: History, daoType: 'MDAO', name: 'history-foam', seqNo: true});

        // load data from array into dao
        CHROME.API.getHistoryEntries(function(entries){
          entries.select({
            put: function(item){
              this.dao.put(History.create(item));
            }.bind(this)
          });
        }.bind(this));

        this.filteredDAO = this.dao.orderBy(DESC(History.TIME));

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



  CLASS({
    name: 'HistoryView',
    extendsModel: 'DetailView',
    mode: 'read-only',
    actions: [
    {
      name: 'delete',
      label: '',  // TODO: How to hide the label?
      help: 'Delete History Entry',
      action: function(item) {
        CHROME.API.deleteHistoryEntry(this.data.url, function(){
          // Maybe we should reverse this i.e., remove from DAO first an let DAO trigger a removal to backend storage 
          this.parent.dao.remove(this.data);
        }.bind(this));
        
      }
    }
    ],
    templates: [
      function CSS(){/*
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
            -webkit-margin-start: 20px;

            background-position-y: center;
            background-repeat: no-repeat;
            background-size: 16px;
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
          .entry .title > a {
            color: rgb(48, 57, 66);
            margin: 2px;
            padding: 2px;
            margin: 4px;
            padding: 0;

            text-decoration: none;
          }
          .entry .title > a:hover {
            text-decoration: underline;
          }
          .entry .domain {
            -webkit-padding-end: 6px;
            -webkit-padding-start: 2px;
            color: rgb(151, 156, 160);
            min-width: -webkit-min-content;
            overflow: hidden;
            white-space: nowrap;
          }
          .actionButton-delete {
            -webkit-padding-end: 15px;
            background: no-repeat url("assets/delete.png");
            border: none;
            display: inline-block;
            height: 15px;
            min-width: 15px;
            outline:0;
          }
      */},
      // TODO: this should be broken down into smaller views
      function toHTML() {/*
          <li class='entry'>
            <div class='entry-box'>
               $$delete
               $$dateTimeOfDay{mode: 'read-only', className:'time'}
                <div class='visit-entry' style='background-image: <%= this.data.favicon %>;' >
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
    name: 'HistoryListView',
    extendsModel: 'DAOListView',
    properties:[
      'lastDate',
      'lastTime',
      {
        name:'rowView',
        defaultValue: 'HistoryView'
      }
    ],
    methods: {
      // Add section heads and gaps
      beforeRowToHTML: function(item, out){
        var date = item.dateRelativeDay,
            time = item.dateTimeOfDay;
        // Add a header everytime the date changes
        if (this.lastDate !== date) {
          this.lastDate = date;
          out.push('<li><h3 class="day">' + date + '</h3></li>');
        } else {
          // Add gaps only between entries in the same day 
          this.addGap(item, out);
        }
      },
      addGap: function(item, out){
        // Amount of time between pageviews that we consider a 'break' in browsing,
        // measured in milliseconds.
        // TODO: make this a constant
        var BROWSING_GAP_TIME = 15 * 60 * 1000;

        // Add gaps if there is a large enough gap 
        if (this.lastTime && this.lastTime - item.time > BROWSING_GAP_TIME) {
            out.push('<li class="gap"></li>');
        }
        this.lastTime = item.time;
      }
    },
    templates: [
      function CSS(){/*
        li {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .gap {
          -webkit-border-end: 1px solid rgb(192, 195, 198);
          height: 14px;
          margin: 1px 0;
          width: 45px;
        }
      */}
    ]
  });
})();

