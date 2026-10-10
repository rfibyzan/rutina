package com.rutina.app

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.room.Room
import com.rutina.app.data.Approval
import com.rutina.app.data.CheckItem
import com.rutina.app.data.EventItem
import com.rutina.app.data.SeedData
import com.rutina.app.data.local.ApprovalEntity
import com.rutina.app.data.local.EventEntity
import com.rutina.app.data.local.RutinaDb
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import org.json.JSONArray

class MainViewModel(app: Application) : AndroidViewModel(app) {
    private val db = Room.databaseBuilder(app, RutinaDb::class.java, "rutina.db").build()
    private val dao = db.dao()

    private val _events = MutableStateFlow<List<EventItem>>(emptyList())
    val events: StateFlow<List<EventItem>> = _events
    private val _approvals = MutableStateFlow<List<ApprovalWithDecision>>(emptyList())
    val approvals: StateFlow<List<ApprovalWithDecision>> = _approvals
    private val _ready = MutableStateFlow(false)
    val ready: StateFlow<Boolean> = _ready

    init {
        viewModelScope.launch {
            if (dao.eventCount() == 0) {
                dao.upsertEvents(SeedData.events.map { it.toEntity() })
                dao.upsertApprovals(SeedData.approvals.map { ApprovalEntity(it.id, it.title, it.requester, it.whenText, it.conflict, null) })
            }
            dao.events().collect { list -> _events.value = list.map { it.toModel() } }
        }
        viewModelScope.launch {
            dao.approvals().collect { list ->
                _approvals.value = list.map { e ->
                    ApprovalWithDecision(Approval(e.id, e.title, e.requester, e.whenText, e.conflict), e.decision)
                }
            }
        }
        _ready.value = true
    }

    fun setRsvp(id: String, rsvp: String) {
        viewModelScope.launch {
            dao.event(id)?.let { dao.upsertEvent(it.copy(rsvp = rsvp)) }
        }
    }

    fun toggleCheck(id: String, index: Int) {
        viewModelScope.launch {
            dao.event(id)?.let { e ->
                val items = e.checklist.toCheckItems().mapIndexed { i, c ->
                    if (i == index) c.copy(done = !c.done) else c
                }
                dao.upsertEvent(e.copy(checklist = items.toJson()))
            }
        }
    }

    fun decide(id: String, decision: String) {
        viewModelScope.launch { dao.decide(id, decision) }
    }

    fun addEvent(item: EventItem) {
        viewModelScope.launch { dao.upsertEvent(item.toEntity()) }
    }

    fun resetDemo() {
        viewModelScope.launch {
            dao.clearEvents()
            dao.clearApprovals()
            dao.upsertEvents(SeedData.events.map { it.toEntity() })
            dao.upsertApprovals(SeedData.approvals.map { ApprovalEntity(it.id, it.title, it.requester, it.whenText, it.conflict, null) })
        }
    }
}

data class ApprovalWithDecision(val approval: Approval, val decision: String?)

private fun EventItem.toEntity() = EventEntity(
    id, title, group, day, dateLabel, start, end, priority, status, rsvp,
    attendees.joinToString(","), extraAttendees, checklist.toJson(), note
)

private fun EventEntity.toModel() = EventItem(
    id, title, group, day, dateLabel, start, end, priority, status, rsvp,
    attendees.split(",").filter { it.isNotEmpty() }, extraAttendees, checklist.toCheckItems(), note
)

private fun List<CheckItem>.toJson(): String {
    val arr = JSONArray()
    forEach { arr.put(org.json.JSONObject().put("label", it.label).put("done", it.done)) }
    return arr.toString()
}

private fun String.toCheckItems(): List<CheckItem> {
    if (isBlank()) return emptyList()
    return try {
        val arr = JSONArray(this)
        List(arr.length()) { i ->
            val o = arr.getJSONObject(i)
            CheckItem(o.getString("label"), o.getBoolean("done"))
        }
    } catch (_: Exception) {
        emptyList()
    }
}
