/*©agpl*************************************************************************
*                                                                              *
* This file is part of FRIEND UNIFYING PLATFORM.                               *
*                                                                              *
* This program is free software: you can redistribute it and/or modify         *
* it under the terms of the GNU Affero General Public License as published by  *
* the Free Software Foundation, either version 3 of the License, or            *
* (at your option) any later version.                                          *
*                                                                              *
* This program is distributed in the hope that it will be useful,              *
* but WITHOUT ANY WARRANTY; without even the implied warranty of               *
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the                 *
* GNU Affero General Public License for more details.                          *
*                                                                              *
* You should have received a copy of the GNU Affero General Public License     *
* along with this program.  If not, see <http://www.gnu.org/licenses/>.        *
*                                                                              *
*****************************************************************************©*/

'user strict';

const log      = require( '../component/Log' )( 'FCMCtrl' );
const FService = require( '../api/FService' );

//const uuid = require( '../component/UuidPrefix' )( 'blah' );
//const events = require( '../component/Events' );

const child = require( 'child_process' )
const util  = require( 'util' )

const ns = {}

/* FCM controller

takes notification info from friendcore and sends it to firebase

*/

ns.FCMCtrl = function( fservice ) {	
	const self = this
	self.conn = null // child process
	
	self.init()
}

// Public

ns.FCMCtrl.prototype.exit = function() {
	const self = this
	log( 'exit NYI' )
}

// Private

ns.FCMCtrl.prototype.init = function() {
	const self = this
	log( 'init 🔥🔥🔥' )
	
	// child process setup
	const exec = './firebase/FCMCtrlProcess.js'
	const jConf = JSON.stringify( global.config.firebase )
	const args = [ jConf ]
	try {
		self.conn = child.fork( exec, args )
	} catch ( ex ) {
		log( 'init - child ex', ex )
	}
	
	self.conn.on( 'exit', onExit )
	self.conn.on( 'error', onError )
	self.conn.on( 'message', onMessage )
	
	function onExit( e ) {
		log( 'conn exit', e )
		process.exit( 3 )
	}
	
	function onError( err ) {
		log( 'conn error', err )
	}
	
	function onMessage( str ) {
		//log( 'conn message', str )
	}
	
	function stdOut( str ) {
		log( 'child.stdOut', str )
	}
	
	// friendcore connection
	self.service = new FService()
	self.service.on( 'pushies', e => self.handleFCPush( e ))
	
}

ns.FCMCtrl.prototype.handleFCPush = function( event ) {
	const self = this
	//log( 'handleFCPush', event )
	self.send( event )
}


ns.FCMCtrl.prototype.send = function( event ) {
	const self = this
	try {
		self.conn.send( event )
	} catch ( ex ) {
		log( 'send ex', ex )
	}
}


module.exports = ns.FCMCtrl