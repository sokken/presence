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

const log = require('./Log')( 'MysqlStartup' );

const ns = {}
ns.MysqlStartup = function( db, funList, onEnd ) {
	const self = this
	log( 'MysqlStartup', {
		db   : !!db,
		funs : !!funList,
		cb   : !!onEnd,
	})
	self.pool = db
	self.onEnd = onEnd
	
	self.init( funList )
}

ns.MysqlStartup.prototype.init = async function( funList ) {
	const self = this
	log( 'init', funList )
	const waiters = funList.map( item => {
		return self[ item ]()
	})
	log( 'waiters', waiters )
	const results = await Promise.all( waiters )
	log( 'waiters done', results )
	
	self.done( 0 )
}

ns.MysqlStartup.prototype.htmlEntitiesCleanup = async function() {
	const self = this
	log( 'htmlEntitiesCleanup' )
	// get all users
	const call_read = 'CALL account_read_full()'
	const all_users = await self.query( call_read )
	//log( 'html - all', res )
	
	// check the thing
	const update = []
	all_users.forEach( user => {
		const fixed = fix_thing( user.name )
		if ( fixed != user.name ) {
			user.name = fixed
			update.push( user )
		}
	})
	
	// update corrections
	log( 'needs update', update )
	const update_waiters = update.map( user => {
		const qStr = 'CALL account_update_name( ?,? )'
		const values = [
			user.clientId,
			user.name,
		]
		return self.query( qStr, values )
	})
	const results = await Promise.all( update_waiters )
	log( 'results', results )
	// happy
	return true
	
	function fix_thing( name ) {
		log( 'fix thing', name )
		if ( 'asd3' == name )
			name = 'asd2'
		
		return name
	}
}

ns.MysqlStartup.prototype.purgeOrphanedSettings = async function() {
	const self = this
	let res = null
	try {
		res = await self.query( "CALL purge_orphaned_settings()" )
	} catch( ex ) {
		log( 'purgeOrphanedSettings ex', ex )
		return ex
	}
	log( 'orph res', res )
	
	return 0
}

ns.MysqlStartup.prototype.query = function( queryStr, values ) {
	const self = this
	return new Promise( execQuery )
	function execQuery( resolve, reject ) {
		self.pool.getConnection( connBack )
		function connBack( err, conn ) {
			if ( err ) {
				reject( 'Could not obtain pool: ' + err )
				return
			}
			
			log( 'send query', queryStr )
			conn.query( queryStr, values, queryBack )
			function queryBack( err, res ) {
				conn.release();
				if ( err ) {
					reject( 'Query failed: ' + err );
					return;
				}
				
				resolve( res[ 0 ] )
			}
		}
	}
}

ns.MysqlStartup.prototype.done = function( err ) {
	const self = this
	const cb = self.onEnd
	
	delete self.db
	delete self.onEnd
	
	cb( err )
}

module.exports = ns.MysqlStartup
