# auto-timestamp
Add timestamp for resources to handle version control automatically.

# usage

1. install
``` shell
npm i auto-timestamp
```

``` js
const path = require('path');
const AutoTimestamp = require('auto-timestamp');

// 配置静态资源路径 - 缩小搜索范围
const staticPaths = [
	path.join(__dirname, './static'),
];
// 配置静态资源过滤器
const blockResourceType = ['html'];
const staticFilter = function(filePath) {
	const extname = path.extname(filePath);
	// 过滤如 .DS_Store等文件
	if (extname == '') return false;
	// 过滤自定义的资源类型
	if (blockResourceType.indexOf(extname.substr(1)) != -1) return false;
	// 过滤lib库
	if (filePath.match('lib')) return false;
	return true;
}
const autoTimestamp = new AutoTimestamp({
	staticPaths: staticPaths,
	staticFilter: staticFilter // 可选
});
// 配置入口路径
const entranceList = [
	path.join(__dirname, 'index.html'),
];
// 运行
autoTimestamp.run(entranceList);
```