package com.rutina.app.data.local

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "events")
data class EventEntity(
    @PrimaryKey val id: String,
    val title: String,
    val group: String,
    val day: String,
    val dateLabel: String,
    val start: String,
    val end: String,
    val priority: Int,
    val status: String,
    val rsvp: String,
    val attendees: String,
    val extraAttendees: Int,
    val checklist: String,
    val note: String
)

@Entity(tableName = "approvals")
data class ApprovalEntity(
    @PrimaryKey val id: String,
    val title: String,
    val requester: String,
    val whenText: String,
    val conflict: String?,
    val decision: String?
)

@Dao
interface RutinaDao {
    @Query("SELECT * FROM events") fun events(): Flow<List<EventEntity>>
    @Query("SELECT * FROM events WHERE id = :id") suspend fun event(id: String): EventEntity?
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun upsertEvents(items: List<EventEntity>)
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun upsertEvent(item: EventEntity)
    @Query("SELECT * FROM approvals") fun approvals(): Flow<List<ApprovalEntity>>
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun upsertApprovals(items: List<ApprovalEntity>)
    @Query("UPDATE approvals SET decision = :decision WHERE id = :id") suspend fun decide(id: String, decision: String)
    @Query("DELETE FROM events") suspend fun clearEvents()
    @Query("DELETE FROM approvals") suspend fun clearApprovals()
    @Query("SELECT COUNT(*) FROM events") suspend fun eventCount(): Int
}

@Database(entities = [EventEntity::class, ApprovalEntity::class], version = 1, exportSchema = false)
abstract class RutinaDb : RoomDatabase() {
    abstract fun dao(): RutinaDao
}
