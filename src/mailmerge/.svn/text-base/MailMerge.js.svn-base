define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/on',
    "dojo/dom-style",
    "dojo/Deferred",
    "jimu/BaseWidget",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    'dojo/text!./MailMerge.html',
    'dijit/form/RadioButton',
    "jimu/dijit/CheckBox",
    'jimu/CustomUtils/QueryUtil',
    "dijit/form/Form",
    "dojo/text!./config.json"
],
function (declare, lang, array, on, domStyle,Deferred, BaseWidget, _TemplatedMixin, _WidgetsInTemplateMixin,  template, RadioButton, CheckBox,QueryUtil, Form,config) {
    var MailMerge = declare([BaseWidget, _WidgetsInTemplateMixin, _TemplatedMixin], {
        templateString: template,
        widgetsInTemplate: true,
        _addressConcat:false,
        _fileName:"records.csv",
        relateTablesConfig:null,
        constructor:function(){
            this.relateTablesConfig = JSON.parse(config);
        },
        _showLoading:function(){
            domStyle.set(this.loadingMask, "display", "block");
        },
        _hideLoading:function(){
            domStyle.set(this.loadingMask, "display", "none");
        },
        execute: function (data) {
           
           
            var deferred = new Deferred();
            this._showLoading();
            this._addressConcat = this.concatenateAddress.get("checked");
            var tableConfigKey = this.templatePicker.attr('value').template;

            if (!this._addressConcat) {
                if (tableConfigKey === 'owner') {
                    this._fileName = "MM_Owner_AddressConcatFalse.csv";
                } else {
                    this._fileName = "MM_Ratepayer_AddressConcatFalse.csv";
                }
            } else {

                if (tableConfigKey === 'owner') {
                    this._fileName = "MM_Owner_AddressConcatTrue.csv";
                } else {
                    this._fileName = "MM_Ratepayer_AddressConcatTrue.csv";
                }
            }

            var tableConfig = this.relateTablesConfig[tableConfigKey];
            var defQuery;
            if (data.features.length > 0) {
                defQuery = tableConfig.field + " IN (";
                array.forEach(data.features, function (feature,index) {
                    var relateAttribute;
                    var attrKeys = Object.keys(feature.attributes);
                    array.some(attrKeys, function (key) {
                        if (key.toLowerCase() == (tableConfig.field).toLowerCase()) {
                            relateAttribute = key;
                            return false;
                        }
                    })
                    if (relateAttribute) {
                        defQuery += feature.attributes[relateAttribute] +",";
                    }
                    if (index == (data.features.length - 1)) {
                        defQuery = lang.trim(defQuery);
                        defQuery = defQuery.replace(/,$/, "");
                        defQuery += ")";
                    }
                });
                var queryObject = {
                    queryDefinition: defQuery,
                    serviceUrl: tableConfig.url,
                    returnGeometry: false,
                    groupByFieldsForStatistics: tableConfig.groupByFields,
                    outFields:tableConfig.outFields
                }
                QueryUtil.executeQuery(queryObject).then(lang.hitch(this,function (res) {
                    var formattedData = this._formatDataForDownLoad(res, tableConfig)
                    this._hideLoading();
                    deferred.resolve({
                        data: formattedData,
                        file:this._fileName
                    });
                }), function (error) {
                    console.log(error);
                    deferred.resolve([]);
                });
                
            }
            return deferred.promise;
        },
        _formatDataForDownLoad: function (response, config) {
            var formattedData = [];
            var excludeFields;
            if (!this._addressConcat) {
                excludeFields = config.defaultExcludeFields || [];
            } else {
                excludeFields = config.excludeFieldsOnConcatenateMode || [];
            }
            var fields = array.map(array.filter(response.fields, function (field) {
                if (array.indexOf(excludeFields, field.alias) == -1 || array.indexOf(excludeFields, field.name) == -1) {
                    return true;
                }
            }), function (f) {
                return f.alias;
            });
            formattedData.push(fields);
            if (!this._addressConcat) {
                array.forEach(response.features, function (feature) {
                    var tempArray = [];
                    array.forEach(fields, function (field) {
                        tempArray.push(feature.attributes[field]);
                    });
                    formattedData.push(tempArray);
                })
            } else {
                var groupByField = config.groupByFields[0];
                var concatFields = config.concatFields;
                array.some(response.fields, function (field) {
                    if (field.alias.toLowerCase() === groupByField || field.name.toLowerCase() === groupByField) {
                        groupByField = field.alias;
                    }
                });
                var features = response.features;
                var flags = [], groupingFieldValues = [], l = features.length, i;
                for( i=0; i<l; i++) {
                    if (flags[features[i].attributes[groupByField]]) continue;
                    flags[features[i].attributes[groupByField]] = true;
                    groupingFieldValues.push(features[i].attributes[groupByField]);
                }
                array.forEach(groupingFieldValues, function (grpFieldValue) {
                    var groupedFeatures = array.filter(features,function(feature,index){
                        if (feature.attributes[groupByField] == grpFieldValue) {
                            return true;
                        }
                    });
                    array.forEach(groupedFeatures, function (feature, index) {
                        array.forEach(concatFields, function (field) {
                            if (index == 0) {
                                groupedFeatures[0].attributes[field] = feature.attributes[field] + ","
                            } else {
                                groupedFeatures[0].attributes[field] += feature.attributes[field] + ","
                            }
                            if (index == (groupedFeatures.length - 1)) {
                                groupedFeatures[0].attributes[field] = groupedFeatures[0].attributes[field].replace(/,$/, "");
                            }
                        });
                    });
                    var tempArray = [];
                    array.forEach(fields, function (field) {
                        tempArray.push(groupedFeatures[0].attributes[field]);
                    });
                    formattedData.push(tempArray);
                });

            }
           return formattedData;
        }
    });
    return MailMerge;
});