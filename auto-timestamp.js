const fs = require('fs');
const path = require('path');
const md5File = require('md5-file');

const IMG_TYPE = ['jpg', 'gif', 'png', 'jpeg', 'webp'];
const INIT_MD5 = "init_md5";

// TODO: handle require module without .js
class AutoTimestamp {

	constructor(opt) {
		opt = opt || {};
		if (!opt.staticPaths) throw new Error('Static paths required!');
		this.documentRoot = opt.documentRoot;

		const filter = opt.staticFilter || staticFilter;
		const staticFiles = opt.staticPaths.reduce((last, folder)=>{
			return last.concat(this.getFiles(folder, filter));
		}, []);

		// staticFiles = {path1: md5, path2: md5}
		this.staticFiles = {};
		staticFiles.forEach((file)=>{
			this.staticFiles[file] = INIT_MD5;
		})

	}

	getFiles(absPath, customFilter) {
		let files = [];
		fs.readdirSync(absPath).forEach((file) => {
	        const filePath = path.join(absPath, file);
	        let stat = fs.statSync(filePath);
	        if (stat.isDirectory()) {
				files = files.concat(this.getFiles(filePath, customFilter));
	        } else if (!customFilter || customFilter(filePath)) {
				files.push(filePath);
			}
	    });
	    return files;
	}


	// TODO: 对中间结果进行缓存
	// 递归，结束条件：无引用
	getTimestamp(entrance) {
		const isImg = isImage(entrance);
		let entranceTxt = isImg ? '' : fs.readFileSync(entrance).toString();
		let staticFile = null;
		let hasReference = false;
		for(staticFile in this.staticFiles) {
			if (isImg) break; // 图片 = 无引用
			const matchResult = matchFile(entrance, entranceTxt, staticFile, this.documentRoot);
			if (matchResult) {
				const { relativePath, matchPath } = matchResult;
				hasReference = true;
				// 获取引用的md5
				const md5 = this.getTimestamp(staticFile);
				// 添加md5
				const pathWithMd5 = `${relativePath}?md5=${md5}`;
				entranceTxt = replaceAll(entranceTxt, matchPath, pathWithMd5);
			}
		}
		if (hasReference) {
			console.log('update with md5：' + entrance);
			fs.writeFileSync(entrance, entranceTxt, 'utf8');
		}

		if (this.staticFiles[entrance]) {
			if (this.staticFiles[entrance] == INIT_MD5) this.staticFiles[entrance] = md5File.sync(entrance);
			return this.staticFiles[entrance];
		}
	}

	run(entranceList) {
		entranceList.forEach((entrance) => {
			this.getTimestamp(entrance);
		});
	}
}

module.exports = AutoTimestamp;

// private method
function staticFilter(filePath) {
	const extname = path.extname(filePath);
	// 过滤如 .DS_Store等文件
	if (extname == '') return false;
	return true;
}

function isImage(filePath) {
	const extname = path.extname(filePath);
	return IMG_TYPE.indexOf(extname.substr(1)) == -1 ? false : true;
}

function rmQueryStr(str) {
	let tmp = str.split('?');
	if (tmp.length !=2) return str;
	return tmp[0];
}

function replaceAll(src, search, replacement) {
    return src.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), 'g'), replacement);
}

function matchFile(entrance, entranceTxt, staticFile, documentRoot) {
	const name = path.basename(staticFile);
	if (documentRoot) {
		/**
		 * 正则匹配：(seajs.use\([\[]*(?:[\'\"][^\'\"]*[\'\"],)*[\'\"]([^\'\"]*xxx(\.js)*[^\'\"]*)[\'\"])
		 * 1. seajs.use(['xxx','xxx'], function(){});	- finished
		 * 2. seajs.use('xxx'); 						- finished
		 * 3. seajs.use('xxx', function());				- finished
		 */
		const seajsRequire = `(seajs.use\\([\\[]*(?:[\\'\\"][^\\'\\"]*[\\'\\"],)*[\\'\\"]([^\\'\\"]*${name.replace('.js', '(.js)*').replace(/\./g,'\\.')}[^\\'\\"]*)[\\'\\"])`;
		const seajsMatch = entranceTxt.match(seajsRequire);
		if (seajsMatch) {
			// 处理seajs引用模块: 1. 不带.js 2. 基于webroot
			const matchPath = seajsMatch[2];
			const relativePath = rmQueryStr(matchPath);
			const absolutePath = path.join(documentRoot, relativePath);
			if (staticFile != absolutePath && staticFile.replace('.js', '') != absolutePath) return; // 绝对路径匹配
			return { relativePath, matchPath };
		}
	}

	// 粗略匹配 - 文件名匹配
	if (entranceTxt.indexOf(name) == -1) return;
	// 正常资源引用
	// 精准匹配 - 路径匹配
	const str = `([^\\'\\"\\(]*${name.replace(/\./g,'\\.')}[^\\'\\"\\)]*)`;
	const match = entranceTxt.match(str); // 相对路径匹配
	if (!match) return;
	const matchPath = match[0];
	const relativePath = rmQueryStr(matchPath);
	const absolutePath = path.join(path.dirname(entrance), relativePath);
	if (staticFile != absolutePath) return; // 绝对路径匹配
	return { relativePath, matchPath };
}
