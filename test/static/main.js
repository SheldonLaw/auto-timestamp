(function(){
	console.log('Hello World!');
	seajs.use('./static/module/a');
	seajs.use('./static/module/a', function(){
		console.log('load module a');
	});
	seajs.use(['./static/module/a','./static/module/a','./static/module/a'], function(){
		console.log('load modules');
	});
})();