### 2.0


### 1.2

- load:start and load:end handling have been moved into a plugin
- nested event keyword now works with views, the callback will always be called with the context of the declaring view and will always recieve the triggering view as the first argument
- empty() the collection element before renderCollection()

### 1.1

- added {{collection}} helper
- _collectionSelector is now deprecated and internally defaults to [data-collection-cid], for backwards compatibility set it to ".collection" in your view classes
- added templatePathPrefix option to configure()
- unit tests!
- added nested event keyword
- added _addEvent method for subclasses to customize event registration
- registerEvents is now an instance method in addition to a class method
- added emptyContext method, called from renderEmpty
- checks for view.name property are now lazy
- exceptions are now thrown instead of using console.error
