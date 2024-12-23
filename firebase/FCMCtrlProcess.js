'use strict';

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


const log = require( '../component/Log' )( 'FCMCtrlProcess' )
const FBAdmin = require( 'firebase-admin' )

const HE = require( 'he' )

const ns = {}

ns.FCMCtrlProcess = function() {
	const self = this
	self.init()
}

ns.FCMCtrlProcess.prototype.init = function() {
	const self = this;
	// process
	const jConf = process.argv[ 2 ];
	const fbConf = JSON.parse( jConf )
	log( 'init', fbConf )
	if ( !fbConf || !fbConf.serviceAccountPath ) {
		self.exit()
		return
	}
	
	self.fbConf = fbConf
	process.on( 'message', e => self.onMessage( e ))
	
	self.ping = setInterval( ping, 5000 )
	function ping() {
		process.send( 'ping' )
	}
	
	// firebase
	const serviceAccount = require( fbConf.serviceAccountPath )
	self.firebase = FBAdmin.initializeApp({
		credential : FBAdmin.credential.cert( serviceAccount ),
	})
	self.msg = self.firebase.messaging()
}

ns.FCMCtrlProcess.prototype.onMessage = function( event ) {
	const self = this
	if ( 'exit' == event ) {
		self.exit()
		return
	}
	
	if ( 'send' == event.type ) {
		self.handlePush( event.data )
		return
	}
	
	log( 'onMessage - unknwon', event )
}

ns.FCMCtrlProcess.prototype.exit = function() {
	const self = this
	clearInterval( self.ping )
	process.exit( 0 )
}

ns.FCMCtrlProcess.prototype.sendPushie = async function( pushMsg, tokens ) {
	const self = this;
	/*
	log( 'sendPushie', { 
		push   : pushMsg, 
		tokens : tokens, 
	}, 3 )
	*/
	if ( tokens ) {
		const jMsg = JSON.stringify( pushMsg )
		const all = tokens.map( token => {
			const msg = JSON.parse( jMsg )
			msg.token = token
			
			return msg
		})
		log( 'all', all )
		const res = await self.msg.sendEach( all )
		log( 'result', res, 3 )
		return
	}
	
	log( 'NYI', [ pushMsg, tokens ])
}

ns.FCMCtrlProcess.prototype.handlePush = function( conf ) {
	const self = this
	const n = self.buildNotie( conf )
	const msg = {
		notification : n,
		data         : conf.data,
	}
	
	msg.android = self.buildAndy( conf )
	
	// enable when needed
	msg.apns = self.buildAPNS( conf )
	
	self.sendPushie( msg, conf.tokens )
}

ns.FCMCtrlProcess.prototype.buildAndy = function( conf ) {
	const self = this;
	const a = conf.android
	const n = {
		collapse_key : 'no.doorman.andy',
		priority     : 'high',
		notification : {
			sound                 : 'default',
			channel_id            : 'all_notifications',
			notification_priority : 'PRIORITY_HIGH'
		},
	}
	
	//log( 'buildAndy', n )
	return n
}

ns.FCMCtrlProcess.prototype.buildAPNS = function( conf ) {
	const self = this
	const i = conf.ios
	const n = {
		headers: {
            'apns-priority': '10',
        },
        payload: {
            aps: {
                sound: 'default',
            }
        },
	}
	
	//log( 'buildAPNS', n )
	return n
}

ns.FCMCtrlProcess.prototype.buildNotie = function( conf ) {
	const n = conf.notification
	return {
		title : HE.decode( n.title ),
		body  : n.body,
	}
}

new ns.FCMCtrlProcess()

