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
    name: 'UndoView',
    extendsModel: 'View',
    properties: [
      { name: 'data' },
      { name: 'action' },
    ],
    templates: [
      function CSS(){/*
        .toast {
          position:fixed;
          bottom: 0;
          background-color: #404040;
          border-radius: 3px;
          box-shadow: 0 0 2px rgba(0,0,0,.12),0 2px 4px rgba(0,0,0,.24);
          color: #fff;
          line-height: 20px;
          padding: 16px;
          transition: opacity 200ms,-webkit-transform 300ms cubic-bezier(0.165,0.840,0.440,1.000);
          white-space: nowrap;
          z-index: 100;
          -webkit-transform: translateY(-10px);
          transform: translateY(-10px);
          font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif;
          font-size: 115%;
        }
        .undo {
          display: inline;
          padding-left: 16px;
          color: #a1c2fa;
          cursor: pointer;
          font-family: "HelveticaNeue-Light","Helvetica Neue Light","Helvetica Neue",Helvetica,Arial,"Lucida Grande",sans-serif;
          font-weight: bold;
          text-transform: uppercase;
        }
        .hidden {
          display: none;
        }
      */},
      function toHTML() {/*
          <div class="toast" id="<%= this.setClass('hidden', function() {return !self.action.isAvailable.call(self.data, self.action);}) %>">
            <span>History entry deleted</span>
            <div class="undo" id="<%= this.on('click', this.action.action.bind(this.data), this.id) %>">Undo</div>
          </div>
      */}
    ]
  });

  CLASS({
    name: 'HistoryController',
    imports: [ 'setTimeout', 'clearTimeout' ],
    properties: [
    {
      name: 'timeoutRef',
      defaultValue: -1
    },
    {
      name:'show_undo_toast',
      defaultValue: false
    },
    {
      name: 'pending_for_delete_item',
      defaultValue: null
    },
    {
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
    }
    ],
    listeners: [
      {
        name: 'onDAOUpdate',
        isFramed: true,
        code: function () {
        }
      }
    ],
    actions: [
    {
      // TODO: This shows up in the "actionToolbar" as a button with no label.
      // Need to suppress that.
      name: 'undoDelete',
      label: '',
      isAvailable: function() {
        // TODO: Looks like a FOAM bug - if the below is removed, siAvailable isn't
        //  re-evaluated when show_undo_toast changes.
        this.show_undo_toast;  // DO NOT REMOVE
        return (this.pending_for_delete_item != null) && this.show_undo_toast;
      },
      action: function() {
        if (this.pending_for_delete_item) {
          this.dao.put(this.pending_for_delete_item);
        }
        this.pending_for_delete_item = null;
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
      },
      undoTimeout: function() {
        CHROME.API.deleteHistoryEntry(this.pending_for_delete_item.url);
        this.show_undo_toast = false;
        pending_for_delete_item = null;
      },
      deleteItem: function(item) {
        if (this.pending_for_delete_item) {
          CHROME.API.deleteHistoryEntry(this.pending_for_delete_item.url);
        }
        this.pending_for_delete_item = item;
        // Remove the item from DAO right away, but don't call CHROME.API.deleteHistoryEntry
        // until the undo timeout expires
        this.dao.remove(item);
        this.show_undo_toast = true;
        if (this.timeoutRef != -1) {
          this.clearTimeout(this.timeoutRef);
          this.timeoutRef = null;
        }
        this.timeoutRef = this.setTimeout(this.undoTimeout.bind(this), 4000);
      },
    },
    templates: [
      function CSS() {/*
        body {
          font-family: 'Lucida Grande', sans-serif;
          font-size: 75%;
        }
        #historyapp {
          padding-top: 50px;
        }
        header {
          position:fixed;
          top:0;
          height: 50px;
          width:100%;
          z-index:3;
          background-image: -webkit-linear-gradient(white, white 40%, rgba(255, 255, 255, 0.92));
          border-bottom: 1px solid black;
          
          display: flex;
        }
        #search {
          margin-right: 20px;
          margin-left: auto;
          align-self: center;
          font-size: 16px;
        }

        @media only screen and (max-device-width : 480px) {
          body {
            font-family: Arial, sans-serif;
            font-size: 100%;
          }
          #historyapp {
            padding-top: 0;
          }
          header {
            position: static;
            flex: auto;
            flex-flow: column;
            padding-bottom: 5px;
            height: auto;
          }
          h1 {
            -webkit-margin-before: 0.2em;
            -webkit-margin-after: 0.2em;
          }
          #search {
            margin-right: auto;
            margin-left: 0;
            width: 100%;
            font-size: 20px;            
          }
        }
      */},
      function toDetailHTML() {/*
        <section id="historyapp">
            <header>
              <h1>History</h1>
              $$query{mode:'read-write', id:'search'}
            </header>
            $$undoDelete{ model_: 'UndoView' }
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
          this.parent.parent.data.deleteItem(this.data);
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
          .actionButton-delete:active {
            background-image: url("assets/delete2.gif");
            outline:0;
          }


          @media only screen and (max-device-width : 480px) {
            .entry-box {
              border-bottom: 1px solid rgb(220, 220, 220);
              border-top: 1px solid rgb(220, 220, 220);
              margin-bottom:0;
            }
            .visit-entry {
              flex: auto;
              flex-flow: column;
              line-height: 1.3;
              -webkit-margin-start: 0;
            }
            .time {
              display: none;
            }
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
      updateHTML: function() {
        this.lastDate = null;
        this.SUPER();
      },
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
        @media only screen and (max-device-width : 480px) {
          h3 {
            font-size: 14px;
          }
          .gap {
            display: none;
          }
          ul{
            padding: 0;
          }
        }
      */}
    ]
  });
})();

