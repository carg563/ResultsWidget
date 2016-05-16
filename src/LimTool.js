define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
     "dojo/Deferred",
     "dojo/aspect",
     "jimu/dijit/Message"


], function (
    declare, array, lang, Deferred,aspect,Message
) {
    var LimTool = declare("LimTool", [], {
        _tempTimer: 5000,
        generateLim: function () {
            var deferred = new Deferred();
            this.msg = new Message({
                message: this._getContentWithSpinner("Processing webmap..",true),
                buttons: [{
                    label: "Cancel",
                    onClick: lang.hitch(this, function () {
                        this.msg.close();
                        deferred.resolve();
                    })
                },

                {
                    label: "Open",
                    onClick: lang.hitch(this, function () {
                        window.open("https://secure.gbs.co.nz/prod_demos/CustomWidgetDemos1/lim/LIM140345_08July2014_274JacksonHuttCity.docx", "_blank");
                        this.msg.close();
                        deferred.resolve();
                    })
                }
                ]
            });
            this.msg.disableButton(1);
            window.setTimeout(lang.hitch(this,function () {
                this._level1process().then(lang.hitch(this, function () {
                    this._level2process().then(function () {
                        deferred.resolve();
                    });
                }));
            }), this._tempTimer)
            return deferred.promise;
        },
        _level1process:function(){
            var msg = this.msg;
            var deferred = new Deferred();
            msg.contentContainerNode.innerHTML = this._getContentWithSpinner("Generating LIM report..", true);
            //msg.set("message", "Hello world");

            window.setTimeout(function () {
                deferred.resolve();
            }, this._tempTimer);
            return deferred.promise;
        },
        _level2process:function(){
            var msg = this.msg;
            var deferred = new Deferred();
            window.setTimeout(lang.hitch(this, function () {
                msg.enableButton(1);
                msg.contentContainerNode.innerHTML =this._getContentWithSpinner( "LIM generation complete",false);
                deferred.resolve();
            }, this._tempTimer));
            return deferred.promise;
        },
        _getContentWithSpinner: function (msg,spinner) {
            var content = '<div style="position:relative;float:left;padding:0 10px;height:40px;line-height:40px;font-size:12px;">' + msg + '</div>';
            if (spinner) {
                content += '<div class="limspinner"></div>';
            }
            return content;
        }
    });
    if (!_instance) {
        var _instance = new LimTool();
    }
    return _instance;
});