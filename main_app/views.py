from django.shortcuts import render, redirect, get_object_or_404
from .models import Report
from .forms import ReportForm

def home(request):
    reports = Report.objects.all().order_by('-created_at')
    return render(request, 'main_app/home.html', {'reports': reports})

def add_report(request):
    if request.method == "POST":
        form = ReportForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('home')
    else:
        form = ReportForm()
    return render(request, 'main_app/add_report.html', {'form': form})

def edit_report(request, report_id):
    report = get_object_or_404(Report, id=report_id)
    if request.method == "POST":
        form = ReportForm(request.POST, instance=report)
        if form.is_valid():
            form.save()
            return redirect('home')
    else:
        form = ReportForm(instance=report)
    return render(request, 'main_app/edit_report.html', {'form': form})

def delete_report(request, report_id):
    report = get_object_or_404(Report, id=report_id)
    if request.method == "POST":
        report.delete()
        return redirect('home')
    return render(request, 'main_app/delete_report.html', {'report': report})