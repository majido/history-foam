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
        // TODO: Find a better way to detect the extension mode and that favicons are available
        if (chrome.history)
          // TODO: For mobile use: getFaviconImageSet(this.url, 32, 'touch-icon')
          return CHROME.getFaviconImageSet(this.url);
        else
          return '';
      }
    }
    ],
    actions: [
    {
      name: 'delete',
      label: '',  // TODO: How to hide the label?
      help: 'Delete History Entry',
      action: function(item) {
        CHROME.backend.deleteUrl(this.url);
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
            background: no-repeat url("delete2.gif");
            border: none;
            display: inline-block;
            height: 15px;
            min-width: 15px;
            outline:0;
          }
          .actionButton-delete:active {
            background-image: url("delete.png");
            outline:0;
          }

      */},
      // TODO: this should be broken down into smaller views
      function toDetailHTML() {/*
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
    // {
    //   name: 'groups'
    // },
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
          // this.dao.select(GROUP_BY(History.DATE_RELATIVE_DAY))(function (q) {
          //   this.groups = q.groups;
          // }.bind(this));
        }
      }
    ],
    methods: { 
      init: function () {
        this.SUPER();
        this.dao = EasyDAO.create({model: History, daoType: 'MDAO', name: 'history-foam', seqNo: true});
        CHROME.backend.history_controller = this;

        // load data from array into dao
        this.getHistoryEntries(function(entries){
          entries.select({
            put: function(item){
              this.dao.put(History.create(item));
            }.bind(this)
          });
        }.bind(this));

        this.filteredDAO = this.dao;

        this.filteredDAO.listen(this.onDAOUpdate);
        this.onDAOUpdate();
      }, 
      getHistoryEntries: function(callback) {
        // Use chrome history API when running as an extension
        // TODO: It currently loads 1000 entries in memory but it should paginate it instead
        if (chrome.history) {
          chrome.history.search({text: '', maxResults: 1000}, function(result) {
            // Add fields to make it match sample data format
            for (var i in result) {
              var entry = result[i];
              var date = new Date(entry.lastVisitTime);
              entry["dateRelativeDay"] = date.toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' }); // TODO: compute relative date e.g., Today - Wednesday, December 17, 2014
              entry["dateShort"] =  date.toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' }); // e.g. "Dec 17, 2014"
              entry["dateTimeOfDay"] = date.toLocaleTimeString('en', {hour:'numeric', minute:'numeric'}); // e.g. "9:31 AM,
              entry["domain"] = new URL(entry.url).host;
            }
            console.log('loading ' + result.length + ' history entries from chrome history API.');
            callback(result);
          });
        } else { // Use sample data
          console.log('loading ' + HISTORY_DATA.length + ' history entries from file.');
          callback(HISTORY_DATA);
        }
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
    name: 'HistoryListView',
    extendsModel: 'DAOListView',
    properties:['lastDate', 'lastTime'],
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

