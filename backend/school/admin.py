from django.contrib import admin

from .models import (
    Announcement,
    FeeRecord,
    Result,
    SchoolClass,
    StudentProfile,
    Subject,
    TeachingAssignment,
    Term,
    TimetableEntry,
)


@admin.register(Term)
class TermAdmin(admin.ModelAdmin):
    list_display = ("__str__", "start_date", "end_date", "is_current", "results_published")
    list_filter = ("year", "results_published")
    actions = ("publish_results", "unpublish_results")

    @admin.action(description="Publish results (students can see them)")
    def publish_results(self, request, queryset):
        queryset.update(results_published=True)

    @admin.action(description="Unpublish results (hide from students)")
    def unpublish_results(self, request, queryset):
        queryset.update(results_published=False)


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ("name", "code")
    search_fields = ("name", "code")
    prepopulated_fields = {"code": ("name",)}


class TeachingAssignmentInline(admin.TabularInline):
    model = TeachingAssignment
    extra = 1
    autocomplete_fields = ("teacher", "subject")


class StudentInline(admin.TabularInline):
    model = StudentProfile
    extra = 0
    autocomplete_fields = ("user",)


@admin.register(SchoolClass)
class SchoolClassAdmin(admin.ModelAdmin):
    list_display = ("name", "grade", "year", "class_teacher")
    list_filter = ("year", "grade")
    search_fields = ("name",)
    autocomplete_fields = ("class_teacher",)
    inlines = (TeachingAssignmentInline, StudentInline)


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "school_class")
    list_filter = ("school_class",)
    search_fields = ("user__username", "user__first_name", "user__last_name")
    autocomplete_fields = ("user", "school_class")


@admin.register(TeachingAssignment)
class TeachingAssignmentAdmin(admin.ModelAdmin):
    list_display = ("teacher", "subject", "school_class")
    list_filter = ("school_class", "subject")
    autocomplete_fields = ("teacher", "school_class", "subject")


@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = ("student", "subject", "term", "school_class", "score", "level", "entered_by", "updated_at")
    list_filter = ("term", "school_class", "subject", "level")
    search_fields = ("student__username", "student__first_name", "student__last_name")
    autocomplete_fields = ("student", "school_class", "subject")
    readonly_fields = ("level", "entered_by", "created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        obj.entered_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ("title", "school_class", "author", "published_at")
    list_filter = ("school_class",)
    search_fields = ("title", "body")
    readonly_fields = ("author", "created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        if not change:
            obj.author = request.user
        super().save_model(request, obj, form, change)


@admin.register(TimetableEntry)
class TimetableEntryAdmin(admin.ModelAdmin):
    list_display = ("school_class", "day", "start_time", "end_time", "subject", "teacher", "room")
    list_filter = ("school_class", "day")
    autocomplete_fields = ("school_class", "subject", "teacher")


@admin.register(FeeRecord)
class FeeRecordAdmin(admin.ModelAdmin):
    list_display = ("student", "term", "amount_due", "amount_paid", "balance", "updated_at")
    list_filter = ("term",)
    search_fields = ("student__username", "student__first_name", "student__last_name")
    autocomplete_fields = ("student",)

    @admin.display(description="Balance")
    def balance(self, obj):
        return obj.balance
