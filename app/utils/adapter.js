import cache from 'appkit/utils/cache';
import pager from 'appkit/utils/pager';
import filter from 'appkit/utils/filter';
import sorter from 'appkit/utils/sorter';
import comparator from 'appkit/utils/comparator';

var Promise = Ember.RSVP.Promise;

function extractFilter (query) {
  var notFilter = {
    page: true,
    pageSize: true,
    sortBy: true,
    sortAsc: true
  },
  result = {};

  for (var prop in query) {
    if (query.hasOwnProperty(prop) && !notFilter[prop]) {
      result[prop] = query[prop];
    }
  }

  return result;
}

function equals (object1, object2) {
  var containsAll = function (source, target) {
    for (var prop in source) {
      if (source.hasOwnProperty(prop)) {
        if (source[prop] !== target[prop]) {
          return false;
        }
      }
    }

    return true;
  };

  return containsAll(object1, object2) && containsAll(object2, object1);
}

function isWhole (context) {
  return context.total && cache.contains(context.key, {from: 0, to: context.total});
}

function getFilterMode (context, _filter) {
  return isWhole(context) && comparator(context.filter, _filter) ? 2 : 0;
} 

function getSnapshot (context, mode) {
  var total, range, data, result = {};

  if (mode === 2) {
    total = context.l2cache.length;
    range = pager.getRange(context.pageSize, context.page, total);
    data = context.l2cache.slice(range.from, range.to);
  } else {
    total = context.total;
    range = pager.getRange(context.pageSize, context.page, total);
    data = cache.readUnsafe(context.key, range);
  }

  result.meta = {
    total: total,
    mode: mode,
    range: range,
    filter: context.filter
  };

  result[context.key] = data;
  return result;
}

export default Ember.Object.extend({
  context: {},
  getCache: function () {
    return cache;
  },
  createContext: function (key) {
    var capacity = this.get('defaultCapacity');
    return {
      key: key,
      filter: {},
      capacity: capacity,
      sort: {
        key: null,
        asc: true,
        value: function (current) {
          return current[this.key];
        }
      }
    };
  },
  getContext: function(key) {
    var context = this.get('context');
    if (context[key] === undefined) {
      context[key] = this.createContext(key);
    }
    return context[key];
  },
  findQuery: function(key, query, findQueryExecutor) {
    var _filter = extractFilter(query),
      context = this.getContext(key),
      mode = getFilterMode(context, _filter),
      range = pager.getRange(query.pageSize, query.page, context.total),
      sort = {
        key: query.sortBy,
        asc: query.sortAsc
      },
      saveContext = function (context) {
        context.sort.key = sort.key;
        context.sort.asc = sort.asc;
        context.page = query.page;
        context.pageSize = query.pageSize;  
      },
      doQueryInternal = function (mode, filterOperator) {
        var data;
        if (context.l2cache) {
          data = context.l2cache;
        } else {
          data = cache.readAll(context.key);
        } 

        if (filterOperator) {
          data = filterOperator(_filter, data);
        } 

        saveContext(context);

        context.l2cache = sorter(context.sort, data);
        return new Promise(function(resolve, reject) {
          resolve(getSnapshot(context, mode));
        });
      };

    if (equals(context.filter, _filter)) {
      if (equals({key: context.sort.key, asc: context.sort.asc}, sort)) {
        if (cache.contains(key, range)) {
          return new Promise(function(resolve, reject) {
            resolve(getSnapshot(context, 1));
          });
        } 
      } else {
        if (isWhole(context)) {
          return doQueryInternal(1);
        }
      } 
    } else {
      if (mode === 2) {
        return doQueryInternal(2, filter);
      } else {
        context.total = undefined;
        cache.reset(key);
      }
    }

    saveContext(context);
    context.filter = _filter;

    range = cache.coverage(context.key, range, context.capacity, context.total);

    return findQueryExecutor(key, {
      filter: _filter,
      sort: sort,
      range: range
    }).then(function(response) {
      //return new Promise(function (resolve, reject) {
        context.total = response.meta.total;
        cache.write(key, response[key], response.meta.range);
        return getSnapshot(context, mode);
      //});
    });
  }

});