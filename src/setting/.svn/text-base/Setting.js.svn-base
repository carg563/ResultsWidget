///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/on',
  'jimu/BaseWidgetSetting',
   'dijit/_WidgetsInTemplateMixin',
  'jimu/CustomUtils/SimpleTable'
],
function (declare,lang,array,on, BaseWidgetSetting, _WidgetsInTemplateMixin, Table) {

    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
    baseClass: 'jimu-widget-resultwidget-setting',

    postCreate: function () {
      this._createExcludeFieldsTable();
      //the config object is passed in
      this.setConfig(this.config);
    },
    _createExcludeFieldsTable:function(){
        var fields = [{
            name: 'field',
            title: this.nls.excludedFields,
            type: 'text',
            unique: false,
            editable: true
        },
       {
           name: 'actions',
           title: this.nls.actions,
           type: 'actions',
           'class': "actions",
           actions: ['edit', 'delete']
       }];
        var args = {
            autoHeight: true,
            fields: fields,
            selectable: true
        };
        this.excludeFieldsTable = new Table(args);
        this.excludeFieldsTable.placeAt(this.excludeFieldsTableCntr);
        this.excludeFieldsTable.startup();
        this.own(on(this.excludeFieldsTable, 'actions-edit', lang.hitch(this, function (row) {
            this.onTableEditClick(this.excludeFieldsTable, row);
        })));
        on(this.addFieldsLabel, "click", lang.hitch(this, function () {
            var data = { field: "" };
            this.onRowAddClick(this.excludeFieldsTable, data);
        }));
    },
        //------------------------------------//
    onRowAddClick: function (table, data) {
        table.finishEditing();
        var rowAddResult = table.addRow(data, false);
        var row = rowAddResult.tr;
        table.editRow(row, data);
    },
    onTableEditClick: function (table, row) {
        table.finishEditing();
        var data = table.getRowData(row);
        table.editRow(row, data);
    },
    setConfig: function(config){
        this._setHighlightFeatureOnRecordSelect(config.highlightFeatureOnRecordSelect);
        this._setZoomToFeature(config.zoomToFeature);
        this._setExportToCSV(config.exportToCSV);
        this._setMailMerge(config.mailMerge);
        this._setRecordsPerPage(config.recordsPerPage);
        this._setExcludedFields(config.excludedFields);
    },
    
    getConfig: function(){
      //WAB will get config object through this method
      return {
          highlightFeatureOnRecordSelect: this._getHighlightFeatureOnRecordSelect(),
          zoomToFeature: this._getZoomToFeature(),
          exportToCSV: this._getExportToCSV(),
          mailMerge:this._getMailMerge(),
          recordsPerPage:this._getRecordsPerPage(),
          excludedFields: this._getExcludedFields()
      };
    },
    _setHighlightFeatureOnRecordSelect: function (checked) {
        checked ? this.highlightFeatureOnRecordSelect.check() : this.highlightFeatureOnRecordSelect.uncheck();
    },
    _getHighlightFeatureOnRecordSelect: function () {
        return this.highlightFeatureOnRecordSelect.checked;
    },
    _setZoomToFeature: function (checked) {
        checked ? this.zoomToFeature.check() : this.zoomToFeature.uncheck();
    },
    _getZoomToFeature: function () {
        return this.zoomToFeature.checked;
    },
    _setExportToCSV: function (checked) {
        checked ? this.exportToCSV.check() : this.exportToCSV.uncheck();
    },
    _getExportToCSV: function () {
        return this.exportToCSV.checked;
    },
    _setMailMerge:function(config){
        (config && config.enabled) ? this.mailMerge.check() : this.mailMerge.uncheck();
        this.mailMergeLayer.set("value",config.mailMergeLayer);
    },
    _getMailMerge:function(){
        return {
            enabled: this.mailMerge.checked,
            mailMergeLayer: this.mailMergeLayer.get("value")
        }
    },
    _setExcludedFields: function (fields) {
        if (fields && fields.length > 0) {
            array.forEach(fields, lang.hitch(this, function (field) {
                this.excludeFieldsTable.addRow({ field: field });
            }));
        }
    },
    _getExcludedFields: function () {
        var data = this.excludeFieldsTable.getData();
        var filteredData = array.map(array.filter(data, function (data) {
            var widget = lang.trim(data.field);
            if (widget) {
                return true;
            }
        }), function (item) {
            return item.field;
        })
        return filteredData;
    },
    _setRecordsPerPage:function(val){
        this.recordsPerPage.set("value", val);
    },
    _getRecordsPerPage: function () {
       return  this.recordsPerPage.get("value");
    }
  });
});