/*
 * jsNotify bundle
 */

/*
 * sAnim v1.0.0
 * https://github.com/GramThanos/sAnim
 *
 * MIT License
 * Copyright (c) 2018 Grammatopoulos Athanasios-Vasileios
 */
var sAnim=function(){function b(a,c,d){a=a||{};this.d={};this.d.fm="number"===typeof a.from?a.from:0;this.d.to="number"===typeof a.to?a.to:0;this.d.tf="number"===typeof a.time&&0<a.time?a.time:500;this.d.ms="number"===typeof a.fps&&0<a.fps?1E3/a.fps:1E3/60;this.d.sp=(this.d.to-this.d.fm)/(this.d.tf/this.d.ms);this.c={stp:c,end:d||null};this.stop()}b.version="v1.0.0";b.prototype.start=function(){if(!this.d.i){var a=this;this.d.i=setInterval(function(){a._step()},this.d.ms);a._step();return this}};
b.prototype.pause=function(){if(this.d.i)return clearInterval(this.d.i),this.d.i=null,this};b.prototype.stop=function(){this.pause();this.d.st=this.d.fm-this.d.sp;return this};b.prototype._step=function(){if(0<this.d.sp&&this.d.st>=this.d.to||0>this.d.sp&&this.d.st<=this.d.to)this._end();else{this.d.st+=this.d.sp;if(0<this.d.sp&&this.d.st>this.d.to||0>this.d.sp&&this.d.st<this.d.to)this.d.st=this.d.to;this.c.stp(this.d.st,this.d.fm,this.d.to,this.d.tf);return this}};b.prototype._end=function(){this.stop();
this.c.end&&this.c.end(this.d.fm,this.d.to,this.d.tf);return this};return b}();

/*
 * jsNotify v1.1.0
 */
var jsNotify=function(){var b=function(d){this.name=d;this.inc=0;this.notifies=[];this.div=document.createElement("div");this.div.className="jsNotify-section";this.div.id="jsNotify-section-"+d;document.body.appendChild(this.div)};b.prototype.hide=function(){this.div.style.display="none"};b.prototype.show=function(){this.div.style.display="block"};b.list={};b.create=function(d){b.list.hasOwnProperty(d)||(b.list[d]=new b(d));return b.list[d]};b.get=function(d){return b.list.hasOwnProperty(d)?b.list[d]:
null};var c=function(d,a,e){var g=this;this.options={section:c.options.section,time2live:c.options.time2live,close_btn:c.options.close_btn,speed:c.options.speed,fps:c.options.fps};if("undefined"!==typeof e)for(var f in e)this.options.hasOwnProperty(f)&&(this.options[f]=e[f]);this.section=b.create(this.options.section);this.id=++this.section.inc;this.section.notifies[this.id]=this;this._anim=!1;e=document.createElement("div");e.className="jsNotify"+("string"===typeof a&&0<a.length?" "+a:"");this.options.close_btn&&
(a=document.createElement("div"),a.className="jsNotify-close close",a.innerHTML="&times;",a.addEventListener("click",function(){g.fadeOut(g.options.speed)},!1),e.appendChild(a));a=document.createElement("div");a.className="jsNotify-content";"string"===typeof d?a.innerHTML=d:a.appendChild(d);e.appendChild(a);d=document.createElement("div");d.className="jsNotify-clear";a=document.createElement("div");a.style.position="absolute";a.style.right="-5000px";a.style.opacity=0;a.appendChild(e);a.appendChild(d);
document.body.appendChild(a);this.height=Math.max(a.clientHeight||0,a.scrollHeight||0,a.offsetHeight||0);this.section.div.appendChild(a);a.style.opacity=0;a.style.height="0px";a.style.overflow="hidden";a.style.position="";a.style.right="";this.wrapper=a;this.fadeIn(this.options.speed);this.options.time2live&&(this.timeout=window.setTimeout(function(){g.fadeOut(g.options.speed)},this.options.time2live))};c.prototype.fadeIn=function(d){if(!this._fadding_in){this._fadding_in=!0;var a=this;this.wrapper.style.opacity=
1;this.wrapper.style.overflow="hidden";d=(new sAnim({from:0,to:100,time:d||500,fps:60},function(e){e=Math.round(e)/100;a.wrapper.style.opacity=e;a.wrapper.style.height=Math.round(a.height*e)+"px"},function(){a.wrapper.style.height="";a.wrapper.style.overflow="";a.wrapper.style.opacity="";a._fadding_in=!1})).start();this._anim&&this._anim.stop();this._anim=d}};c.prototype.fadeOut=function(d,a){if(!this._fadding_out){this._fadding_out=!0;var e=this;this.wrapper.style.overflow="hidden";var g=(new sAnim({from:100,
to:0,time:d||500,fps:30},function(f){f=Math.round(f)/100;e.wrapper.style.opacity=f;e.wrapper.style.height=Math.round(e.height*f)+"px"},function(){e._fadding_out=!1;("undefined"===typeof a||a)&&e.destroy()})).start();this._anim&&this._anim.stop();this._anim=g}};c.prototype.destroy=function(){this.timeout&&(clearTimeout(this.timeout),this.timeout=null);this.wrapper.parentNode.removeChild(this.wrapper);delete this.section.notifies[this.id];delete this.wrapper};c.options={section:"default",time2live:!1,
close_btn:!0,speed:250,fps:60};var h=function(d,a,e){return new c(d,a,e)};h.options=c.options;return h}();jsNotify.bootstrap=function(b,c,h){return jsNotify(b,"alert alert-"+c+" alert-dismissible",h)};jsNotify.primary=function(b,c){return this.bootstrap(b,"primary",c)};jsNotify.secondary=function(b,c){return this.bootstrap(b,"secondary",c)};jsNotify.success=function(b,c){return this.bootstrap(b,"success",c)};jsNotify.danger=function(b,c){return this.bootstrap(b,"danger",c)};
jsNotify.warning=function(b,c){return this.bootstrap(b,"warning",c)};jsNotify.info=function(b,c){return this.bootstrap(b,"info",c)};jsNotify.light=function(b,c){return this.bootstrap(b,"light",c)};jsNotify.dark=function(b,c){return this.bootstrap(b,"dark",c)};

/*
 * jsNotify v1.1.0
 * Bootstrap Theme API
 */
jsNotify.bootstrap=function(a,b,c){return jsNotify(a,"alert alert-"+b+" alert-dismissible",c)};
jsNotify.primary=function(a,b){return this.bootstrap(a,"primary",b)};
jsNotify.secondary=function(a,b){return this.bootstrap(a,"secondary",b)};
jsNotify.success=function(a,b){return this.bootstrap(a,"success",b)};
jsNotify.danger=function(a,b){return this.bootstrap(a,"danger",b)};
jsNotify.warning=function(a,b){return this.bootstrap(a,"warning",b)};
jsNotify.info=function(a,b){return this.bootstrap(a,"info",b)};
jsNotify.light=function(a,b){return this.bootstrap(a,"light",b)};
jsNotify.dark=function(a,b){return this.bootstrap(a,"dark",b)};
