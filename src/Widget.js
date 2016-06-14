define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/dom-style',
    'dojo/dom-class',
    'dojo/on',
    'dojo/aspect',
    'dojo/topic',
    'dojo/query',
    'dojo/dom-attr',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/_TemplatedMixin',
    'jimu/BaseWidget',
    'jimu/WidgetManager',
    'dojo/dom-construct',
    'jimu/PanelManager',
    'jimu/dijit/LoadingShelter',
    "dojo/data/ObjectStore",
    "dojo/store/Memory",
    "dojo/data/ItemFileWriteStore",
    "dijit/tree/ObjectStoreModel", 
    "dijit/Tree",
    "dijit/form/Button",
    "dijit/form/Select",
    'jimu/dijit/Message',
    'jimu/CustomUtils/CsvGenerator',
    './LimTool',
    './mailmerge/MailMerge',
    "dojox/grid/EnhancedGrid",
    "dojox/grid/enhanced/plugins/Pagination"
],
function (declare, lang, array, domStyle, domClass, on, aspect,topic, domQuery, domAttr, _WidgetsInTemplateMixin, _TemplatedMixin,
    BaseWidget, WidgetManager, domConstruct, PanelManager, LoadingShelter,
    ObjectStore, Memory, ItemFileWriteStore,ObjectStoreModel,Tree, Button, Select,Message, CsvGenerator, LimTool,MailMerge, EnhancedGrid
    ) {
    return declare([BaseWidget, _WidgetsInTemplateMixin, _TemplatedMixin], {
    baseClass: 'jimu-widget-resultswidget',
    _mapUtil:null,
    _resultsSet:[],
    _resultsSymbology:null,
    _zoomToResultsOnLoad: false,
    _isResetView: true,
    _isAttributeView: false,
    _isTabularView: false,
    _isTreeView:false,
    _limLayer: 'Parcel Boundaries',
    _giscoSelectWidgetName: null,
    postCreate: function () {
        this.inherited(arguments);
        //resizing the width of this widget
        var pm = PanelManager.getInstance().getPanelById(this.id + '_panel');
        //  pm.resize({ w: 550 });
        domStyle.set(pm.domNode, "min-width", "450px");
    },
    startup: function () {
        this.inherited(arguments);

        this._giscoSelectWidgetName = this._checkWidgetExistsUsingPropName('isGISCOSelectWidget');
        
        if (this._giscoSelectWidgetName !== null) {

            this.historyUI.addChild(new Button({
                label: this.nls.historySelect,
                onClick: lang.hitch(this, function () {                    
                    this._hideWidgetPanel(this.id + '_panel');
                    this._displayWidgetPanel(this._giscoSelectWidgetName);
                })
            }));
        }

        this._createLoadingShelter();
        this._populateToolbar();
        this._renderTabularView();
        this._renderAttributeView();
        this._renderTreeView();
        this._enableResetView();
        this._setVersionTitle();   
    },
    _createLoadingShelter:function(){
        this.shelter = new LoadingShelter({
            hidden: true
        });
        this.shelter.placeAt(this.domNode);
        this.shelter.startup();
    },
    _populateToolbar: function () {
        var exportBtn, zoomToFeatureBtn;
        var data =   [{ value: "nolayers", label: "No Layers" }];
        this.layerList = new Select({
            autoWidth: true,
            forceWidth: false,
            "class": "jimu-list resultswidget-tbar-layerlist",
            options:data,
            value:data[0].value
        });
        this.layerList.on("change", lang.hitch(this, function () {
            this._handleLayerChange();
        }))
        this.toolbar.addChild(this.layerList);

       
        //1//Table View Button
        this.tableViewBtn = new Button({
            showLabel: false,
            'class': 'resultswidget-tbar-btn',
            iconClass: "table-view",
            title: this.nls.showTabularView,
            onClick:lang.hitch(this,function () {
                this._enableTabularView();
            })
        });
        

        //2//Zoom to feature
        if (this.config.zoomToFeature) {
            zoomToFeatureBtn = new Button({
                showLabel: false,
                'class': 'resultswidget-tbar-btn',
                iconClass: "zoom-to",
                title: this.nls.zoomToFeature,
                onClick: lang.hitch(this,function () {
                    this._zoomToFeatures();
                })
            });
        }

        //3//Export to CSV
       
        if (this.config.exportToCSV) {
            exportBtn = new Button({
                showLabel: false,
                'class': 'resultswidget-tbar-btn',
                iconClass: "export",
                title: this.nls.exportToCSV,
                onClick: lang.hitch(this, function () {
                    this._exportToCSV();
                })
            });
        }
        var clearBtn = new Button({
            showLabel: false,
            'class': 'resultswidget-tbar-btn',
            iconClass: "clear",
            title: this.nls.clear,
            style: "float:right",
            onClick: lang.hitch(this,function () {
                this._clearResults();
            })
        });

        // mail merge tool 
        if (this.config.mailMerge !== null && this.config.mailMerge.enabled) {
            this.mmTool = new Button({
                showLabel: false,
                'class': 'resultswidget-tbar-btn',
                iconClass: "mailmerge",
                title: this.nls.mailMerge,
                style: "float:right;display:none;",
                onClick: lang.hitch(this, function () {
                    this._showMailMergeTool();
                })
            });
        }


        //tewmp tool
        this.limTool = new Button({
            showLabel: false,
            'class': 'resultswidget-tbar-btn',
            iconClass: "lim",
            title: "LIM",
            style: "float:right;display:none;",
            onClick: lang.hitch(this, function () {
                LimTool.generateLim();
            })
        })

       
        

        this.toolbar.addChild(clearBtn);
        if (this.config.exportToCSV) {
            this.toolbar.addChild(exportBtn);
        }
        if (this.config.zoomToFeature) {
            this.toolbar.addChild(zoomToFeatureBtn);
        }
        this.toolbar.addChild(this.tableViewBtn);
        if (this.config.mailMerge.enabled) {
            this.toolbar.addChild(this.mmTool);
        }
        this.toolbar.addChild(this.limTool)
    },
    _handleLayerChange:function(){
        var id = this.layerList.get("value");
        var response = this._getResponse(id);
        this._setuniqueFeatureIdentifier(response.uniqueFeatureIdentifier);
        var zoomToGraphics = false;
        //if (this._zoomToResultsOnLoad && !response.loaded) {
        //    zoomToGraphics = true
        //} else {
        //    zoomToGraphics = false
        //}
        if (this.hasMapUtil()) {
            this._mapUtil.addResultsToMap(this.map, [response], this._resultsSymbology, true, this._zoomToResultsOnLoad, this._zoomConfig);
            //response.loaded = true;
        }
        if (response.treeData) {
            this._enableTreeView();
            this._updateTreeView(response);
        } else {
            this._enableTabularView();
            this._updateTableView(response);
        }
        
    },
    _setuniqueFeatureIdentifier:function(id){
        this._uniqueFeatureIdentifier = id;
    },
    _updateTableView: function (response) {
        if (response.customFields.length === 0) {
            this._populateCustomFields(response)
        }
        var tailoredFields = lang.clone(response.customFields);
        array.forEach(tailoredFields,function(field){
            field.formatter = function (value, index, cellObj) {
                var regExp = new RegExp(/^https?:/)
                if (regExp.test(value)) {
                    return "<a target = '_blank'  href = " + value + ">" + value + "</a>";
                } else {
                    return value;
                }
            };
        })
        this.multiRecordsView.setStructure(tailoredFields);
        var uniqueIDField = response.uniqueFeatureIdentifier;
        if (!uniqueIDField) {
            throw ("No unique identifier found.Failed to render grid");
            return;
        }

        var data = {
            identifier: uniqueIDField,
            items: []
        };
        array.forEach(response.features,lang.hitch(this, function (feature) {
            var attributes = lang.clone(feature.attributes);
            attributes = this._formatAttributesWithAliasKeys(attributes, tailoredFields);
            data.items.push(attributes);
        }));
        var attributeStore = new ItemFileWriteStore({
            data: data
        });
        this.multiRecordsView.selection.deselectAll();
        this.multiRecordsView.setStore(attributeStore);
        this.multiRecordsView.pagination.plugin.firstPage();
        this.multiRecordsView.resize();
        this.multiRecordsView.update();

        //going to attribute view if there is only one feature
        if (response.features.length == 1) {
            this.multiRecordsView.selection.addToSelection(0);
        }
    },
    _updateTreeView: function (response) {
        // Completely delete every node from the dijit.Tree    
        this.treeView.model.root.children = null;

        // Destroy the widget
        this.treeView.destroyRecursive();
        this.treeView.destroy();


        var dataStore = new Memory({
            data: response.treeData,
            getChildren: function (object) {
                return this.query({ parent: object.id });
            }
        });


        //new model

        var treeModel = new ObjectStoreModel({
            store: dataStore,
            query: { root: true }
        });

        //new tree
        this.treeView = new Tree({
            model: treeModel,
            showRoot: false,
            autoExpand:true,
            onClick: function (item) {
                if (item.url) {
                    window.open(item.url, "_blank")
                }
            }
        });
        this.treeViewCntr.addChild(this.treeView);
        this.treeView.startup();
        domStyle.set(this.treeView.domNode, "height", "100%");
    },
    _populateCustomFields: function (response) {
        var fields = response.fields;
        var excludedFields = this.config.excludedFields;
        var customFields = [];
        var uniqueIDField = response.uniqueFeatureIdentifier;
        array.forEach(fields, function (field) {
            var hidden = false;
            var regExp = new RegExp(uniqueIDField);
            var validExclusion = false;
            array.some(excludedFields, function (excludedFieldName) {
                var exp = new RegExp(excludedFieldName, "ig");
                if (exp.test(field.name) || exp.test(field.alias)) {
                    validExclusion = true;
                    return true
                } 
            });
            if (validExclusion || (regExp.test(field.name))) {
                hidden = true;
            }
            customFields.push({
                name: field.alias,
                field: field.alias,
                actualField:field.name,
                hidden: hidden
            })
        });
        response.customFields = customFields;
    },
    _formatAttributesWithAliasKeys: function (attributes, tailoredFields) {
        array.forEach(tailoredFields, function (field) {
            if (!attributes[field.name]) {
                //case where actual field name is mapped in attributes object
                if (attributes[field.actualField]) {
                    attributes[field.name] = attributes[field.actualField];
                    delete attributes[field.actualField];
                }
            }
        });
        return attributes;
    
    },
    _getResponse:function(id){
        var response = array.filter(this._resultsSet, function (result) {
            return result.uniqueId == id;
        })[0];
        return response;
    },
    _renderTabularView: function () {
        /*set up data store*/
        var data = {
            identifier: 'value',
            items: [{ value: "No data" }]
        };
        var store = new ItemFileWriteStore({ data: data });

        var gridLayout = [
            { 'name': 'Field', 'field': 'value' }
        ];
        this.multiRecordsView = new EnhancedGrid({
            store: store,
            "class": "resultswidget-table-grid",
            structure: gridLayout,
            style: 'height: 100%; width:100%;',
            keepRows: 1000,
            keepSelection: false,
            rowsPerPage: 1000,
            rowSelector: false,
            selectionMode: 'single',
            cellOverClass: "resultswidget-table-grid-hover",
            selectable: true, 
            plugins: {
                pagination: {
                    //pageSizes: ["10","20","30","40","50","100","All"],
                    sizeSwitch: false,
                    maxPageStep: 3,
                    defaultPageSize: 30,
                    defaultPage: 1,
                    gotoButton: false,
                    description: true,
                    /*page step to be displayed*/
                    /*position of the pagination bar*/
                    position: "bottom"
                }
            },
            onSelected: lang.hitch(this,function (rowIndex) {
                rowIndex = this._getActualIndexInStore(rowIndex, this.multiRecordsView);
                this._highLightFeature(rowIndex);
                this._enableAttributeView();
                this._updateAttributeView(rowIndex);
            })
        });
        aspect.before(this.multiRecordsView, "onRowClick", lang.hitch(this,function () {
            this.multiRecordsView.selection.deselectAll();//this is to make sure a onSelected handler is always fired when a row is clicked irrespective of whether the row has selection already
        }));
        this.multiRecordsViewCntr.addChild(this.multiRecordsView);
        this.multiRecordsView.startup();
        
    },
    _getActualIndexInStore:function(index,grid){
        var me = this;
        var items = grid._by_idx;
        var uniqueID = items[index].idty;
        var actualIndex;
        array.forEach(grid.get("store")._arrayOfAllItems,lang.hitch(this,function (item, i) {
            if (item[this._uniqueFeatureIdentifier][0] == uniqueID) {
                actualIndex = i;
            }
        }));
       // console.log("actualIndex in the store:" + actualIndex);
        return actualIndex;
    },
    _highLightFeature:function(rowIndex){
        if(this.config.highlightFeatureOnRecordSelect){
            var res = this._getResponseInContext();
            var feature = res.features[rowIndex];
            this._mapUtil.highlightFeature(this.map, feature, this._resultsSymbology);
        }
    },
    _updateAttributeView: function (rowIndex) {
        var res = this._getResponseInContext();
        var feature = res.features[rowIndex];
        var attributes = lang.clone(feature.attributes);

        var data = {
            identifier: 'attribute',
            items: []
        };

        var fields = res.customFields;
        array.forEach(fields, function (fieldObj) {
            if (!fieldObj.hidden) {
                var value = attributes[fieldObj.name] || attributes[fieldObj.actualField];
                data.items.push({ attribute: fieldObj.name, value: value });
            }
        });

        var store = new ItemFileWriteStore({ data: data });
        this.singleRecordView.setStore(store);
        this.singleRecordView.resize();
        this.singleRecordView.update();
       
    },
    _getResponseInContext:function(){
        var uniqueId = this.layerList.get("value");
        var response = this._getResponse(uniqueId);
        return response;
    },
    _renderAttributeView: function () {
        var data = {
            identifier: 'attribute',
            items: [
            {
                attribute: "Not defined",
                value: ""
            }]
        };
        var store = new ItemFileWriteStore({ data: data });

        var gridLayout = [
            {
                name: 'Attribute',
                field: 'attribute',
                width: '50%'
            },
            {
                name: 'Value',
                field: 'value',
                width: '50%',
                formatter: function (value,index, cellObj) {
                    var regExp = new RegExp(/^https?:/)
                    if (regExp.test(value)) {
                        return  "<a target = '_blank'  href = " + value + ">" + value + "</a>";
                    } else {
                        return value;
                    }
                }
            }
        ];
        /*create a new grid:*/
        this.singleRecordView = new EnhancedGrid({
            store: store,
            'class': 'resultswidget-attr-grid',
            escapeHTMLInData: false,
            style: 'height: 100%; width:99%;',
            structure: gridLayout,
            rowSelector: false,
            cellOverClass: "resultswidget-attr-grid-hover",
            selectable: true,
            keepRows: 100,
            rowsPerPage: 100,
            autoHeight: true
        });
     
        this.singleRecordViewCntr.addChild(this.singleRecordView);
        this.singleRecordView.startup();
       
    },
    _renderTreeView:function(){
        var dummyStore = new Memory({
            data: [{ id: '*', name: 'No data', root: true }],
            getChildren: function (object) {
                return object;
            }
        });
        var treeModel = new ObjectStoreModel({
            store: dummyStore
        });
        this.treeView = new Tree({
            model: treeModel
        });
        this.treeViewCntr.addChild(this.treeView);
        this.treeView.startup();
    },
    resize: function () {
        if (this._isAttributeView) {
            this._resizeGrid(this.singleRecordView)
        } else if (this._isTabularView) {
            this._resizeGrid(this.multiRecordsView)
        }
    },
    _resizeGrid:function(grid){
        var cont = grid.getParent().domNode;
        var h = cont.clientHeight - 4;
        var w = cont.clientWidth;
        if (h >= 0) {
            grid.attr("height", h + "px");
            domStyle.set(grid.domNode, "height",h + "px");
            domStyle.set(grid.domNode, "width",w + "px");
            grid.resize(true);
            grid.update();
        }
    },
    onReceiveData: function (name, widgetId, data, historyData) {
        if (data.interogate) {
            this._setResultsSet(data.results)
            this._setSymbologyConfig(data.symbology)
            if (data.mapUtil) {
                this._setMapUtil(data.mapUtil)
            }
            this._setZoomToResultsOnLoad(data.zoomToResults);
            this._setZoomConfig(data.zoomConfig);
            this._processResults();
        }
    },
    _setResultsSet:function(results){
        this._resultsSet =results;
    },
    _setSymbologyConfig:function(symbology){
        this._resultsSymbology = symbology;
    },
    _setMapUtil:function(mapUtil){
        this._mapUtil = mapUtil;
    },
    _setZoomToResultsOnLoad:function(zoom){
        this._zoomToResultsOnLoad = zoom;
    },
    _setZoomConfig: function (zoomConfig) {
        this._zoomConfig = zoomConfig;
    },
    _processResults:function(){
        if (this._resultsSet.length == 0) {
            this._clearResults();
        } else {
            this._populateLayerList();
        }
    },
    _populateLayerList:function(){
        var dataArray = array.map(this._resultsSet, function (res) {
            return { label: res.name, value: res.uniqueId }
        });
        var selectedLayer = dataArray[0].value;
        //this.layerList.store.objectStore.setData(dataArray);
        this.layerList.reset();
        this.layerList.set("options", []);
        this.layerList.addOption(dataArray);
        this.layerList.set("value", selectedLayer);
        //to trigger the onchange event programmatically since
        //'set("value",selectedLayer)' after adding new set of options
        //doesnt appear to trigger "change" event for dijit/form/Select
        this.layerList.onChange()
    },
    _enableResetView: function () {
        this._isResetView = true;
        this._isAttributeView = false;
        this._isTabularView = false;
        this._isTreeView = false;
        domClass.replace(this.toolbar.domNode, "inactive", "active");
        domClass.replace(this.singleRecordViewCntr.domNode, "inactive", "active");
        domClass.replace(this.multiRecordsViewCntr.domNode, "inactive", "active");
        domClass.replace(this.treeViewCntr.domNode, "inactive", "active");
        domClass.replace(this.resetView.domNode, "active", "inactive");
        
    },
    _enableAttributeView: function () {
        this._isResetView = false;
        this._isAttributeView = true;
        this._isTabularView = false;
        this._isTreeView = false;
        domClass.replace(this.toolbar.domNode, "active", "inactive");
        domClass.replace(this.singleRecordViewCntr.domNode, "active", "inactive");
        domClass.replace(this.multiRecordsViewCntr.domNode, "inactive", "active");
        domClass.replace(this.treeViewCntr.domNode, "inactive", "active");
        domClass.replace(this.resetView.domNode, "inactive", "active");

        domClass.replace(this.tableViewBtn.domNode, "active", "inactive");
       

        
        var res = this._getResponseInContext();
        
        if (this.config.mailMerge.enabled) {
            var mmLayer = lang.trim(this.config.mailMerge.mailMergeLayer);
            if (mmLayer) {
                if (((res.serviceUrl + "/" + res.serviceLayerIntId) === mmLayer) || res.name === mmLayer) {
                    domStyle.set(this.mmTool.domNode, "display", "block");
                } else {
                    domStyle.set(this.mmTool.domNode, "display", "none");
                }
            } else {
                domStyle.set(this.mmTool.domNode, "display", "none");
            }
        }

        //temp code
        if (res.name === this._limLayer) {
            domStyle.set(this.limTool.domNode, "display", "block");
        } else {
            domStyle.set(this.limTool.domNode, "display", "none");
        }
        this.resize();
    },
    _enableTabularView:function(){
        this._isResetView = false;
        this._isAttributeView = false;
        this._isTabularView = true;
        this._isTreeView = false;
        domClass.replace(this.toolbar.domNode, "active", "inactive");
        domClass.replace(this.singleRecordViewCntr.domNode, "inactive", "active");
        domClass.replace(this.multiRecordsViewCntr.domNode, "active", "inactive");
        domClass.replace(this.resetView.domNode, "inactive", "active");
        domClass.replace(this.tableViewBtn.domNode, "inactive", "active");
        domClass.replace(this.treeViewCntr.domNode, "inactive", "active");
        

        var res = this._getResponseInContext();

        if (this.config.mailMerge.enabled) {
            var mmLayer = lang.trim(this.config.mailMerge.mailMergeLayer);
            if (mmLayer) {
                if (((res.serviceUrl + "/" + res.serviceLayerIntId) === mmLayer) || res.name === mmLayer) {
                    domStyle.set(this.mmTool.domNode, "display", "block");
                } else {
                    domStyle.set(this.mmTool.domNode, "display", "none");
                }
            } else {
                domStyle.set(this.mmTool.domNode, "display", "none");
            }
        }


        //temp code
        domStyle.set(this.limTool.domNode, "display", "none");

        this.resize();
    },
    _enableTreeView:function(){
        this._isResetView = false;
        this._isAttributeView = false;
        this._isTabularView = false;
        this._isTreeView = true;

        domClass.replace(this.toolbar.domNode, "active", "inactive");
        domClass.replace(this.singleRecordViewCntr.domNode, "inactive", "active");
        domClass.replace(this.multiRecordsViewCntr.domNode, "inactive", "active");
        domClass.replace(this.resetView.domNode, "inactive", "active");
        domClass.replace(this.tableViewBtn.domNode, "inactive", "active");
        domClass.replace(this.treeViewCntr.domNode, "active", "inactive");
        if (this.config.mailMerge.enabled) {
            domStyle.set(this.mmTool.domNode, "display", "none");
        }

        //temp code
        domStyle.set(this.limTool.domNode, "display", "none");

        this.resize();
    },
    _exportToCSV:function(){
        var response = this._getResponseInContext();
        var fields = response.customFields;
        if (this._isAttributeView) {
            var selectedFeatures = [];
            var selectedItems = this.multiRecordsView.selection.getSelected();
            array.forEach(selectedItems, lang.hitch(this, function (item) {
                var rowIndex = this.multiRecordsView.getItemIndex(item);
                rowIndex = this._getActualIndexInStore(rowIndex, this.multiRecordsView);
                selectedFeatures.push(response.features[rowIndex]);
            }));
            array.forEach(selectedFeatures, function (feature) {
                var csvData = [];
                var attributes = lang.clone(feature.attributes);
                array.forEach(fields, function (fieldObj) {
                    if (!fieldObj.hidden) {
                        var value = attributes[fieldObj.name] || attributes[fieldObj.actualField];
                        csvData.push([fieldObj.name, value])
                    }
                });
                csvGenerator = new CsvGenerator(csvData, 'record.csv',"",true);
                csvGenerator.download(true);
            });
        } else if (this._isTabularView) {
            var csvData = [];
            var fieldArray = [];
            array.forEach(fields, function (fieldObj) {
                if (!fieldObj.hidden && fieldObj.name) {
                    fieldArray.push(fieldObj.name);
                }
            })
            csvData.push(fieldArray);
            array.forEach(response.features, function (feature) {
                var attributesArray = [];
                var attributes = lang.clone(feature.attributes);
                array.forEach(fields, function (fieldObj) {
                    if (!fieldObj.hidden) {
                        var value = attributes[fieldObj.name] || attributes[fieldObj.actualField];
                        attributesArray.push(value);
                    }
                })
                csvData.push(attributesArray);
            });
            csvGenerator = new CsvGenerator(csvData, 'records.csv', "", true);
            csvGenerator.download(true);
        }
        //new CsvGenerator();
    },
    _zoomToFeatures: function () {
        if (this._isAttributeView) {
            if (this._mapUtil) {
                var selectedItems = this.multiRecordsView.selection.getSelected();
                var selectedFeatures = [];
                var response = this._getResponseInContext();
                array.forEach(selectedItems, lang.hitch(this, function (item) {
                    var rowIndex = this.multiRecordsView.getItemIndex(item);
                    rowIndex = this._getActualIndexInStore(rowIndex, this.multiRecordsView);
                    selectedFeatures.push(response.features[rowIndex]);
                }));
                this._mapUtil.zoomToFeatures(this.map,selectedFeatures);
            }
        } else if (this._isTabularView) {
            if (this._mapUtil) {
                this._mapUtil.zoomToSelectLayer(this.map);
            }
        }
    },
    clearResults:function(){
        this._clearResults();
    },
    _clearResults:function(){
        this._featureSet = [];
        if (this._mapUtil) {
            this._mapUtil.clearResultsFromMap(this.map);
            this._mapUtil.clearSelectToolLayerFromMap(this.map);
        }
        this._resetTableView();
        this._resetAttributeView();
        this._enableResetView();
        topic.publish("RESULTS_PANEL_CLEARED");

    },
    _resetTableView:function(){
        var data = {
            identifier: 'value',
            items: [{ value: "No data" }]
        };
        var store = new ItemFileWriteStore({ data: data });
        var gridLayout = [
            { 'name': 'Field', 'field': 'value' }
        ];
        this.multiRecordsView.setStructure(gridLayout)
        this.multiRecordsView.setStore(store);
        this.multiRecordsView.resize();
        this.multiRecordsView.update();
    },
    _resetAttributeView:function(){
        var data = {
            identifier: 'attribute',
            items: [
            {
                attribute: "Not defined",
                value: ""
            }]
        };
        var store = new ItemFileWriteStore({ data: data });
        this.singleRecordView.setStore(store);
        this.singleRecordView.resize();
        this.singleRecordView.update();
    },
    _showLoading:function(){
        if (this.shelter) {
            this.shelter.show();
        }
    },
    _hideLoading:function(){
        if (this.shelter) {
            this.shelter.hide();
        }
    },
    hasMapUtil:function(){
        return this._mapUtil ? true: false;
    },
    destroy: function () {
        if (this._mapUtil) {
            this._mapUtil.clearResultsFromMap(this.map);
        }
        this._destoryMailMerge();
        this.inherited(arguments);
    },
    _getMailMergeData: function () {
        var response = this._getResponseInContext();
        var mailmergeRequestObject = {
            features: []
        }
        if (this._isAttributeView) {
            var selectedItems = this.multiRecordsView.selection.getSelected();
            array.forEach(selectedItems, lang.hitch(this, function (item) {
                var indexInPage = this.multiRecordsView.getItemIndex(item)
                var indexInStore = this._getActualIndexInStore(indexInPage, this.multiRecordsView);
                mailmergeRequestObject.features.push(response.features[indexInStore]);
            }));
        } else if (this._isTabularView) {
            mailmergeRequestObject.features = response.features;
        }
        return mailmergeRequestObject;
    },
    _showMailMergeTool: function () {
        if (this.mailMergeWin) {
            domStyle.set(this.mailMergeWin.domNode, "display", "block");
            domStyle.set(this.mailMergeWin.overlayNode, "display", "block");
        } else {
            this._createMailMergeTool();
        }
        //MailMerge.execute()
    },
    _createMailMergeTool: function () {
        var mailMerge = new MailMerge();
        this.mailMergeWin = new Message({
            message: mailMerge.domNode,
            titleLabel: "Mail Merge",
            baseClass: "jimu-popup jimu-message mailmerge-cntr",
            hideOnClose: true,
            buttons: [
                {
                    label: "Create",
                    onClick: lang.hitch(this, function () {
                        mailMerge.execute(this._getMailMergeData()).then(lang.hitch(this, function (obj) {
                            this.mailMergeWin.close();
                            csvGenerator = new CsvGenerator(obj.data, obj.file, "", true);
                            csvGenerator.download(true);
                        }));
                        
                    })
                }
            ],
            onClose: lang.hitch(this, function () {
                if (this.mailMergeWin.hideOnClose) {
                    domStyle.set(this.mailMergeWin.domNode, "display", "none");
                    domStyle.set(this.mailMergeWin.overlayNode, "display", "none");
                    return false;
                } 
            })
        });
    },
    _destoryMailMerge:function(){
        if (this.mailMergeWin) {
            this.mailMergeWin.hideOnClose = false;
            this.mailMergeWin.close();
        }
    },
    _setVersionTitle: function () {
        var labelNode = this._getLabelNode(this);

        var manifestInfo = this.manifest;
        var devVersion = manifestInfo.devVersion;
        var devWabVersion = manifestInfo.developedAgainst || manifestInfo.wabVersion;
        var codeSourcedFrom = manifestInfo.codeSourcedFrom;
        var client = manifestInfo.client;

        var title = "Dev version: " + devVersion + "\n";
        title += "Developed/Modified against: WAB" + devWabVersion + "\n";
        title += "Client: " + client + "\n";
        if (codeSourcedFrom) {
            title += "Code sourced from: " + codeSourcedFrom + "\n";
        }
        if (labelNode) {
            domAttr.set(labelNode, 'title', title);
        }
    },
    _getLabelNode: function (widget) {
        var labelNode;
        if (!(widget.labelNode) && !(widget.titleLabelNode)) {
            if (widget.getParent()) {
                labelNode = this._getLabelNode(widget.getParent());
            }
        } else {
            labelNode = widget.labelNode || widget.titleLabelNode;
        }
        return labelNode;

    },
    _checkWidgetExistsUsingPropName: function (propNameToCheck) {
        var widgetName = null;
        var allWidgets = []
        if (this.appConfig.widgetOnScreen) {
            allWidgets = [].concat(this.appConfig.widgetOnScreen.widgets);
        }
        if (this.appConfig.widgetPool) {
            allWidgets = allWidgets.concat(this.appConfig.widgetPool.widgets);
        }
        array.some(allWidgets, lang.hitch(this, function (widget) {
            var isWidgetConfigured = widget.manifest ? (widget.manifest.hasOwnProperty("properties") ? (widget.manifest.properties[propNameToCheck] ? true : false) : false) : false;
            if (isWidgetConfigured) {
                widgetName = widget.name;
            }
        }));
        return widgetName;
    },
    _hideWidgetPanel: function (panelId) {

        if (panelId === null || panelId === '') return;

        PanelManager.getInstance().closePanel(panelId);
    },
    _displayWidgetPanel: function (widgetName) {

        if (widgetName === null || widgetName === '') return;

        var widgetManager = WidgetManager.getInstance();
        var widget = widgetManager.getWidgetsByName(widgetName);
        var widgetLoaded = widget.length > 0;
        
        if (widgetLoaded) {
            widget = widget[0];
            if (widget.state === 'closed') {                    
                widgetManager.openWidget(widget);
                PanelManager.getInstance().showPanel(widget);                    
            }
        } else {
            var loadWidget = this.appConfig.getConfigElementsByName(widgetName)[0];
            if (loadWidget) {
                this.openWidgetById(loadWidget.id);
            } 
        }        
    }
  });
});