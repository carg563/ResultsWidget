define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/on',
    "dojo/dom-style",
    "jimu/BaseWidget",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    'dojo/text!./Report.html',
    "dojo/text!./config.json",
    "dijit/form/Form",
    "dijit/form/Select",
    "dojo/Deferred",
    "esri/tasks/Geoprocessor",
    "esri/layers/GraphicsLayer",
    "esri/graphic",
    "esri/symbols/SimpleMarkerSymbol"
],
function (declare, lang, array, on, domStyle, BaseWidget, _TemplatedMixin, _WidgetsInTemplateMixin, template, config, Form, Select,
    Deferred, Geoprocessor, GraphicsLayer, Graphic, SimpleMarkerSymbol) {

    return declare([BaseWidget, _TemplatedMixin, _WidgetsInTemplateMixin], {

        name: 'CustomReport',
        baseClass: 'jimu-widget-custom-report',
        templateString: template,

        constructor: function (args) {
            declare.safeMixin(this, args);
            this.config = JSON.parse(config);
        },

        postCreate: function () {
            lang.hitch(this, this._setReports());
        },

        _showLoading: function () {
            domStyle.set(this.loadingMask, "display", "block");
        },

        _hideLoading: function () {
            domStyle.set(this.loadingMask, "display", "none");
        },

        _setReports: function () {

            if (this.config.templates) {
                var reports = array.map(this.config.templates, function (template) {
                    return { label: template.name, value: template.value }
                });
                this.reportList.addOption(reports);
                this.reportList.set("value", reports[0].value);
            } else {
                domStyle.set(this.reportListCntr, "display", "none");
            }

            this.setControls();
        },

        destroy: function () {

            if (this.onHandle) {
                this.onHandle.remove();
                this.onHandle = null;
            }

            if (this._layer) {
                this._layer.clear();
                this.map.removeLayer(this._layer);
                this._layer = null;
            }
        },

        setMap: function (map) {

            this.map = map;
            this.onHandle = on(this.map, 'click', lang.hitch(this, function (evt) {

                var form = this.ctrlzonepim.get('value');

                if (form && form.hasOwnProperty('replocation')) {

                    document.getElementsByName("replocation")[0].value = evt.mapPoint.x + ',' + evt.mapPoint.y;

                    if (!this._layer) {
                        this._layer = new GraphicsLayer();
                        this.map.addLayer(this._layer);
                    }

                    this._layer.clear();
                    this._layer.add(new Graphic(evt.mapPoint, new SimpleMarkerSymbol()));
                }
            }));
        },

        setControls: function () {

            domStyle.set(this.ctrlzonelim.domNode, "display", this.reportList.value === 'zonelim' ? 'block' : 'none');
            domStyle.set(this.ctrlzonepim.domNode, "display", this.reportList.value === 'zonepim' ? 'block' : 'none');
            domStyle.set(this.ctrlresource.domNode, "display", this.reportList.value === 'Consent' ? 'block' : 'none');
        },

        execute: function (data) {

            var deferred = new Deferred();
            this._showLoading();

            var geoprocessor = new Geoprocessor(this.config.url);

            var form = this.ctrlresource.get('value');

            var params = { 
                ReportId: this.reportList.value, 
                ObjectIds: data.map(function (f) { return f.attributes.OBJECTID }).join(),
                GenerateExcel: (form.includeExcel && form.includeExcel.length > 0),
                BufferSize: parseFloat(form.bufferSize)
            };
            
            if (this.reportList.value === 'zonepim') {

                var form = this.ctrlzonepim.get('value');

                params.PointXY = form.replocation;
            }

            geoprocessor.execute(params,
                lang.hitch(this, function (response) {

                    if (response && response.length > 0) {

                        for (var i = 0; i < response.length; i++) {

                            var output = response[i];

                            if (output.paramName === 'OutputFilePath' && output.value && output.value.ReportsUrls) {

                                if (output.value.ReportsUrls.indexOf('|') > -1) {

                                    window.open(output.value.ReportsUrls.split('|')[1]);
                                    window.open(output.value.ReportsUrls.split('|')[0]);
                                    
                                }
                                else {
                                    window.open(output.value.ReportsUrls);
                                }
                            }
                        }
                    }

                    this._hideLoading();
                    deferred.resolve(response);

                }), lang.hitch(this, function (error) {

                    this._hideLoading();
                    deferred.resolve(error);
                }));

            return deferred.promise;
        }
    });
});