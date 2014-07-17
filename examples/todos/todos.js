$(function(){

  var util = {
    uuid: function () {
      var i, random;
      var uuid = '';

      for (i = 0; i < 32; i++) {
        random = Math.random() * 16 | 0;
        if (i === 8 || i === 12 || i === 16 || i === 20) {
          uuid += '-';
        }
        uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
      }
      return uuid;
    }
  };

  var Todo = Backbone.Model.extend({

    defaults: function() {
      return {
        title: "empty todo...",
        // order: this.collection.nextOrder(),
        done: false
      };
    },

    toggle: function() {//获得model的属性done的值
      this.save({done: !this.get("done")});
    }

  });

  var TodoList = Backbone.Collection.extend({

    model: Todo,

    localStorage: new Backbone.LocalStorage(this.todoId),//new Backbone.LocalStorage("todos-backbone"),

    initialize: function(models, options) {
      this.todoId = options.todoId;
    },//!!!!!!!

    done: function() {
      return this.where({done: true});
    },

    remaining: function() {
      return this.where({done: false});
    },

    nextOrder: function() {
      if (!this.length) return 1;
      return this.last().get('order') + 1;
    },

    comparator: 'order',

    sync: function (method, collection, options) {
      if(method === 'read') {
        todos = JSON.parse(localStorage.getItem(this.todoId));
        collection.trigger("reset", collection, todos, options);
        if (options && options.success)
          options.success(todos);
      }
    }

  });
  
  var TodoView = Backbone.View.extend({

    tagName:  "li",

    template: _.template($('#item-template').html()),

    events: {
      "click .toggle"   : "toggleDone",
      "dblclick .view"  : "edit",
      "click a.destroy" : "clear",
      "keypress .edit"  : "updateOnEnter",
      "blur .edit"      : "close"
    },

    initialize: function() {
      this.listenTo(this.model, 'change', this.render);
      this.listenTo(this.model, 'destroy', this.remove);
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      this.$el.toggleClass('done', this.model.get('done'));
      this.input = this.$('.edit');

      return this;
    },

    toggleDone: function() {
      this.model.toggle();
    },

    edit: function() {
      this.$el.addClass("editing");
      this.input.focus();
    },

    close: function() {
      var value = this.input.val();
      if (!value) {
        this.clear();
      } else {
        this.model.save({title: value});
        this.$el.removeClass("editing");
      }
    },

    updateOnEnter: function(e) {
      if (e.keyCode == 13) this.close();
    },

    clear: function() {
      this.model.destroy();
    }

  });
  
  storeNum = 0;

  var TodoListView = Backbone.View.extend({

    statsTemplate: _.template($('#stats-template').html()),
    listTemplate: _.template($('#todo-template').html()),

    events: {
      "keypress .new-todo":  "createOnEnter",
      "click .clear-completed": "clearCompleted",
      "click .toggle-all": "toggleAllComplete"
    },

    initialize: function() {
      this.listenTo(this.collection, 'add', this.addOne);
      this.listenTo(this.collection, 'reset', this.addAll);
      this.listenTo(this.collection, 'all', this.render2);
      // this.render();
      // this.collection.fetch();

    },

    render: function() {
      this.$el.html(this.listTemplate());//???
      this.input = this.$(".new-todo");
      this.allCheckbox = this.$(".toggle-all")[0];
      this.footer = this.$('footer');
      this.main = this.$('.main');
      return this  
    },

    render2: function() {
      var done = this.collection.done().length;
      var remaining = this.collection.remaining().length;  
      
      if (this.collection.length) {
        this.main.show();
        this.footer.show();
        this.footer.html(this.statsTemplate({done: done, remaining: remaining}));
      } else {
        this.main.hide();
        this.footer.hide();
      }
      this.allCheckbox.checked = !remaining;      
      return this;
    },

    addOne: function(todo) {
      var view = new TodoView({model: todo});
      this.$(".todo-list").append(view.render().el);
      this.render2();
    },

    addAll: function() {
      console.log(this.collection);
      this.collection.each(this.addOne, this);
    },

    createOnEnter: function(e) {
      if (e.keyCode != 13) return;
      if (!this.input.val()) return;
      if (e.keyCode == 13){
        var value = $(e.target.value).selector;
      }

      var newModel = new Todo({title: this.input.val()});//model的实例对象
      var collecStr = localStorage.getItem(this.collection.todoId);
      
      if(!collecStr) 
        collecJson = [];
      else 
        collecJson = JSON.parse(collecStr);

      this.collection.set(collecJson);
      this.collection.add(newModel);
      // console.log(this.collection);
      localStorage.setItem(this.collection.todoId,JSON.stringify(this.collection.toJSON()));

      this.input.val('');
      // var viewlist = new TodoListView({collection:this.collection}).render();
         
    },

    clearCompleted: function() {
      _.invoke(this.collection.done(), 'destroy');
      return false;
    },

    toggleAllComplete: function () {
      var done = this.allCheckbox.checked;
      this.collection.each(function (todo) { todo.save({'done': done}); });
    }

  });
  
  var AppView = Backbone.View.extend({

    el: $("#body"),

    events:{
      "click #addTodoView": "addTodoView"
    },

    todoListViews: [],

    initialize: function() {

      for(var todoId in localStorage) {
        todoList = new TodoList([], {todoId: todoId});
        todoListView = new TodoListView({collection:todoList});
        this.todoListViews.push(todoListView);
      }
    },

    render:function(){
      that = this;
      _.each(that.todoListViews, function(todoListView){
        that.$el.append(todoListView.render().$el);
        todoListView.collection.fetch()
      });
      return that;
    },

    addTodoView: function(){
      todoId = util.uuid();
      localStorage.setItem(todoId,'');//JSON.stringify([])
      todoList = new TodoList([], {todoId: todoId});
      todoListView = new TodoListView({collection:todoList});
      this.todoListViews.push(todoListView);
      this.render();
    }
  });

  var App = new AppView().render();

});
